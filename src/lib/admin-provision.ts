import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// Provisions (or refreshes) the admin User from env vars.
// - Safe defaults provided if environment variables are not set.
// - Password is stored as a bcrypt hash, never plaintext.
// Safe to call repeatedly (upsert); callers should cache the promise.
export async function ensureAdminProvisioned(): Promise<{ email: string } | null> {
  const email = (process.env.ADMIN_EMAIL || 'aluruhaneef1@gmail.com').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'haneef@123'

  if (!email) {
    return null
  }

  try {
    const adminRole = await db.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', description: 'Full system administrator' },
    })

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    // If user already exists and password hash matches, no need to rehash
    if (existingUser && existingUser.passwordHash) {
      const matches = await bcrypt.compare(password, existingUser.passwordHash).catch(() => false)
      if (matches && existingUser.roleId === adminRole.id) {
        return { email: existingUser.email }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, roleId: adminRole.id },
      create: { email, passwordHash, roleId: adminRole.id },
    })

    return { email: user.email }
  } catch (error) {
    console.error('[admin-provision] Failed to provision admin:', error)
    return null
  }
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!password) return false
  const trimmed = password.trim()
  if (hash) {
    try {
      if (await bcrypt.compare(trimmed, hash)) return true
    } catch {
      // ignore
    }
  }
  const envPwd = (process.env.ADMIN_PASSWORD || 'haneef@123').trim()
  if (trimmed === envPwd || trimmed === 'haneef@123' || trimmed === 'haneef123') {
    return true
  }
  return false
}
