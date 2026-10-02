import { createHmac, timingSafeEqual } from 'crypto'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { redirect, forbidden } from 'next/navigation'
import { db } from '@/lib/db'
import { adminAuth } from '@/lib/firebase-admin'
import { ensureAdminProvisioned } from '@/lib/admin-provision'

export type AppRole = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export const SESSION_COOKIE = 'sr-session'
const SESSION_MAX_AGE_S = 60 * 60 * 24 // 24h

export class AuthError extends Error {
  status: 401 | 403
  constructor(status: 401 | 403, message: string) {
    super(message)
    this.status = status
  }
}

export interface Requester {
  uid: string
  email: string
  role: AppRole
}

function getSessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[auth-guard] NEXTAUTH_SECRET not set — using insecure dev fallback. Set NEXTAUTH_SECRET in production.')
    return 'dev-only-insecure-session-secret'
  }
  throw new Error('NEXTAUTH_SECRET must be set in production')
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function hmacSign(data: string): string {
  return createHmac('sha256', getSessionSecret()).update(data).digest('base64url')
}

/** Issue a signed session token. Signature covers uid+email+role+exp. */
export function signSessionToken(claims: { uid: string; email: string; role: AppRole }): string {
  const payload = b64urlEncode(
    JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S })
  )
  return `${payload}.${hmacSign(payload)}`
}

/** Verify signature + expiry. Returns claims or null. Never throws. */
export function verifySessionToken(token: string | null | undefined): Requester | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  try {
    const expected = hmacSign(payloadB64)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const claims = JSON.parse(b64urlDecode(payloadB64)) as Requester & { exp: number }
    if (!claims.uid || !claims.email || !claims.role) return null
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null
    return { uid: claims.uid, email: claims.email, role: claims.role }
  } catch {
    return null
  }
}

// Lazy admin provisioning (cached per server instance; retries on failure).
let provisionPromise: Promise<unknown> | null = null
function ensureProvisionedLazy(): Promise<unknown> {
  if (!provisionPromise) {
    provisionPromise = ensureAdminProvisioned().catch((err) => {
      provisionPromise = null
      console.warn('[auth-guard] admin provisioning skipped:', err)
      return null
    })
  }
  return provisionPromise
}

async function readRawToken(): Promise<string | null> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const fromCookie = cookieStore.get(SESSION_COOKIE)?.value?.trim()
  if (fromCookie) return fromCookie
  const authHeader = headerStore.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim()
  return null
}

/**
 * Resolve the caller to a DB-backed { uid, email, role }.
 * Trust sources ONLY:
 *  1. HMAC-signed session cookie (issued by /api/auth/login after bcrypt check),
 *     with the role re-loaded from the DB so revocations apply immediately.
 *  2. Firebase JWT verified by firebase-admin (when configured), mapped to a DB user.
 * Unverifiable tokens are NEVER trusted. Returns null when not logged in.
 */
export async function resolveRequester(): Promise<Requester | null> {
  await ensureProvisionedLazy()
  const raw = await readRawToken()
  if (!raw) return null

  // 1. First-party signed session
  const session = verifySessionToken(raw)
  if (session) {
    const user = await db.user.findUnique({
      where: { id: session.uid },
      include: { role: { select: { name: true } } },
    })
    if (!user || user.email.toLowerCase() !== session.email.toLowerCase()) return null
    return { uid: user.id, email: user.email, role: user.role.name as AppRole }
  }

  // 2. Verified Firebase ID token (only when Admin SDK is configured)
  try {
    if (adminAuth && typeof adminAuth.verifyIdToken === 'function') {
      const decoded = await adminAuth.verifyIdToken(raw)
      const email = typeof decoded.email === 'string' ? decoded.email.toLowerCase() : null
      if (email) {
        const user = await db.user.findUnique({
          where: { email },
          include: { role: { select: { name: true } } },
        })
        if (user) {
          return { uid: user.id, email: user.email, role: user.role.name as AppRole }
        }
      }
    }
  } catch {
    // Invalid/expired Firebase token → fall through to null
  }

  return null
}

/**
 * THE reusable server helper. Verifies the session and enforces roles.
 * - Throws AuthError(401) when not logged in.
 * - Throws AuthError(403) when logged in but role is not allowed.
 */
export async function requireRole(roles: AppRole[]): Promise<Requester> {
  const requester = await resolveRequester()
  if (!requester) {
    throw new AuthError(401, 'Unauthorized: sign-in required')
  }
  if (!roles.includes(requester.role)) {
    throw new AuthError(403, 'Forbidden: insufficient role')
  }
  return requester
}

/** API-route wrapper: returns a 401/403 NextResponse on failure, else null + requester. */
export async function guardRoles(
  roles: AppRole[]
): Promise<{ denied: NextResponse | null; requester: Requester | null }> {
  try {
    const requester = await requireRole(roles)
    return { denied: null, requester }
  } catch (err) {
    if (err instanceof AuthError) {
      return { denied: NextResponse.json({ error: err.message }, { status: err.status }), requester: null }
    }
    throw err
  }
}

/** True only for a verified ADMIN/STAFF session (for mixed customer+admin routes). */
export async function isPrivilegedRequest(): Promise<boolean> {
  const requester = await resolveRequester()
  return requester?.role === 'ADMIN' || requester?.role === 'STAFF'
}

/**
 * Server-component wrapper for pages under src/app/admin/.
 * Redirects to login when anonymous (401-equivalent), renders 403 when role is wrong.
 */
export async function requirePageRole(roles: AppRole[]): Promise<Requester> {
  try {
    return await requireRole(roles)
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.status === 401) redirect('/auth/login')
      forbidden()
    }
    throw err
  }
}

export function buildSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
}
