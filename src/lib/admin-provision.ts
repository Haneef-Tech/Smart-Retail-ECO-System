import bcrypt from 'bcryptjs'
import { db, withDbRetry } from '@/lib/db'

let provisionedEmail: string | null = null
let isProvisioning = false

// Provisions (or refreshes) the admin User from env vars ONLY.
// - Requires BOTH ADMIN_EMAIL and ADMIN_PASSWORD.
// - Password is stored as a bcrypt hash, never plaintext.
// - Caches successful provisioning in-memory to avoid hammering the DB on every request.
export async function ensureAdminProvisioned(): Promise<{ email: string } | null> {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''

  if (!email || !password) {
    if (!password) {
      console.warn('[admin-provision] ADMIN_PASSWORD not set — skipping admin auto-provisioning.')
    }
    return null
  }

  // Already provisioned in this server instance
  if (provisionedEmail === email) {
    return { email }
  }

  if (isProvisioning) {
    return { email }
  }

  isProvisioning = true
  try {
    const result = await withDbRetry(async () => {
      const adminRole = await db.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', description: 'Full system administrator' },
      })

      const passwordHash = await bcrypt.hash(password, 10)

      const user = await db.user.upsert({
        where: { email },
        update: { passwordHash, roleId: adminRole.id },
        create: { email, passwordHash, roleId: adminRole.id },
      })

      return user
    })

    provisionedEmail = result.email
    return { email: result.email }
  } catch (err) {
    console.error('[admin-provision] failed:', err)
    return null
  } finally {
    isProvisioning = false
  }
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!password || !hash) return false
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}
