import { PrismaClient } from '@prisma/client'

// Serverless-safe singleton: one PrismaClient per server instance, cached on
// globalThis so Next.js dev hot-reloads and Vercel function reuse never
// exhaust the Postgres (Neon/Supabase pooled) connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

globalForPrisma.prisma = db

export default db

function isTransientDbError(error: unknown): boolean {
  // Prisma P1001 = "Can't reach database server" — Neon cold-start wakeup.
  // P1002/P1008/P1017 are also connection/timeout class errors worth one retry.
  const code = (error as { code?: string })?.code
  if (code === 'P1001' || code === 'P1002' || code === 'P1008' || code === 'P1017') return true
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('Connection terminated') ||
    msg.includes('timed out fetching a new connection')
  )
}

/**
 * Run a DB query with one retry after a short pause.
 * Neon free-tier computes sleep when idle; the first query wakes it but
 * Prisma times out (P1001). Retrying once absorbs the wakeup so callers
 * don't see a spurious 500.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, delayMs = 2500): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (!isTransientDbError(error)) throw error
    console.warn('[db] transient connection failure, retrying once after wakeup pause…')
    await new Promise((r) => setTimeout(r, delayMs))
    return fn()
  }
}
