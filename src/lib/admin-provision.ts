import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// Provisions (or refreshes) the admin User from env vars ONLY.
// - Requires BOTH ADMIN_EMAIL and ADMIN_PASSWORD.
// - If ADMIN_PASSWORD is missing/empty, NO admin is created (fail closed).
// - Password is stored as a bcrypt hash, never plaintext.
// Safe to call repeatedly (upsert); callers should cache the promise.
export async function ensureAdminProvisioned(): Promise<{ email: string } | null> {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''

  if (!email || !password) {
    if (!password) {
      console.warn('[admin-provision] ADMIN_PASSWORD not set — skipping admin auto-provisioning.')
    }
    return null
  }

  const adminRole = await db.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Full system administrator' },
  })

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, roleId: adminRole.id },
    create: { email, passwordHash, roleId: adminRole.id },
  })

  return { email: user.email }
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!password || !hash) return false
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}
