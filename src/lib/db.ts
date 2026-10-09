import { PrismaClient } from '@prisma/client'

// Serverless-safe singleton: one PrismaClient per process, cached on globalThis
// so Next.js dev hot-reloads don't create multiple instances.
// DATABASE_URL should point to Neon's connection pooler (PgBouncer) endpoint:
// ep-...-pooler.c-6.us-east-2.aws.neon.tech
// This handles connection limits transparently — no P2024 exhaustion.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export default db

// ─────────────────────────────────────────────────────────────────────────────
// withDbRetry: one automatic retry for transient Neon cold-start errors.
// On the free tier, compute suspends after 5 min of inactivity; the first
// request after suspension can time out before the compute wakes up.
// ─────────────────────────────────────────────────────────────────────────────
function isTransientDbError(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  // P1001 = can't reach server, P1002/P1008 = timeout, P1017 = conn closed
  if (code && ['P1001', 'P1002', 'P1008', 'P1017'].includes(code)) return true
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase()
  return (
    msg.includes("can't reach database server") ||
    msg.includes('connection terminated') ||
    msg.includes('timed out fetching a new connection') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  )
}

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 3000): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === retries) throw error
      console.warn(`[db] transient connection failure (attempt ${attempt + 1}/${retries + 1}) — waiting for Neon wakeup...`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastError
}
