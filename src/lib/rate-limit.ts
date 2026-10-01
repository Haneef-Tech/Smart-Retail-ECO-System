import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export interface RatePreset {
  limit: number
  windowS: number
}

export const RATE_PRESETS = {
  login: { limit: 30, windowS: 60 }, // 30/min per IP
  aiChat: { limit: 20, windowS: 60 }, // 20/min per user
  aiExecute: { limit: 20, windowS: 60 }, // 20/min per user
  csvUpload: { limit: 5, windowS: 3600 }, // 5/hour per user
  checkout: { limit: 10, windowS: 60 }, // 10/min per user
  heavy: { limit: 10, windowS: 60 }, // ETL / bulk deletes per user
  standard: { limit: 120, windowS: 60 }, // general authenticated reads/writes
} satisfies Record<string, RatePreset>

export type RatePresetName = keyof typeof RATE_PRESETS

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

// In-memory fallback for local dev (per server instance; best-effort).
const memoryBuckets = new Map<string, { count: number; resetAt: number }>()
function memoryCheck(key: string, { limit, windowS }: RatePreset): { allowed: boolean; retryAfterS: number } {
  const now = Date.now()
  if (memoryBuckets.size > 10000) {
    for (const [k, v] of memoryBuckets) {
      if (v.resetAt <= now) memoryBuckets.delete(k)
    }
  }
  const bucket = memoryBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowS * 1000 })
    return { allowed: true, retryAfterS: 0 }
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterS: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  bucket.count += 1
  return { allowed: true, retryAfterS: 0 }
}

async function upstashCheck(key: string, { limit, windowS }: RatePreset): Promise<{ allowed: boolean; retryAfterS: number } | null> {
  try {
    const countRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store',
    })
    if (!countRes.ok) return null
    const { result: count } = (await countRes.json()) as { result: number }
    if (count === 1) {
      await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${windowS}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: 'no-store',
      })
    }
    if (count > limit) {
      const ttlRes = await fetch(`${UPSTASH_URL}/ttl/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: 'no-store',
      })
      const ttlJson = (await ttlRes.json().catch(() => ({ result: windowS }))) as { result: number }
      const retry = typeof ttlJson.result === 'number' && ttlJson.result > 0 ? ttlJson.result : windowS
      return { allowed: false, retryAfterS: retry }
    }
    return { allowed: true, retryAfterS: 0 }
  } catch {
    return null // Redis unreachable → fall back to memory (fail open, logged below)
  }
}

/** Client identity: prefer authenticated user id, else IP. */
export async function rateLimitIdentity(req: NextRequest | null, userId?: string | null): Promise<string> {
  if (userId) return `user:${userId}`
  try {
    const h = req ? req.headers : await headers()
    const fwd = h.get('x-forwarded-for')
    const ip = fwd ? fwd.split(',')[0].trim() : h.get('x-real-ip')?.trim() || 'unknown'
    return `ip:${ip}`
  } catch {
    return 'ip:unknown' // outside a request scope (tests/edge) — still rate-limits globally
  }
}

/**
 * Fixed-window rate limit. Returns a 429 NextResponse (with Retry-After)
 * when exceeded, else null. Uses Upstash Redis REST when env vars exist,
 * otherwise an in-memory fallback for local dev.
 */
export async function checkRateLimit(
  req: NextRequest | null,
  preset: RatePresetName,
  userId?: string | null,
  scope = 'api'
): Promise<NextResponse | null> {
  const { limit, windowS } = RATE_PRESETS[preset]
  const identity = await rateLimitIdentity(req, userId)
  const key = `rl:${scope}:${preset}:${identity}`

  let verdict: { allowed: boolean; retryAfterS: number }
  if (useUpstash) {
    const remote = await upstashCheck(key, { limit, windowS })
    if (remote) {
      verdict = remote
    } else {
      console.warn('[rate-limit] Upstash unreachable, using memory fallback')
      verdict = memoryCheck(key, { limit, windowS })
    }
  } else {
    verdict = memoryCheck(key, { limit, windowS })
  }

  if (!verdict.allowed) {
    const res = NextResponse.json(
      { success: false, error: 'Too many requests. Please slow down and try again shortly.' },
      { status: 429 }
    )
    res.headers.set('Retry-After', String(verdict.retryAfterS))
    return res
  }
  return null
}
