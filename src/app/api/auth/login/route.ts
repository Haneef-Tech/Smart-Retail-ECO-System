import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { ensureAdminProvisioned, verifyPassword } from '@/lib/admin-provision'
import { signSessionToken, buildSessionCookie, type AppRole } from '@/lib/auth-guard'
import { apiError, readJsonBody, validate } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validators/auth'

/**
 * Password login for DB-backed users (admin/staff provisioned with bcrypt hashes).
 * Customers continue to use Firebase client auth; this endpoint only serves
 * users present in the User table.
 */
export async function POST(req: NextRequest) {
  // 5 attempts per minute per IP (brute-force protection)
  const limited = await checkRateLimit(req, 'login')
  if (limited) return limited

  try {
    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(loginSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const { email, password } = parsed.data

    let user = await withDbRetry(() =>
      db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { role: { select: { name: true } } },
      })
    )

    // Lazy provision only if admin user does not exist in DB
    if (!user && email.trim().toLowerCase() === (process.env.ADMIN_EMAIL || '').trim().toLowerCase()) {
      await ensureAdminProvisioned()
      user = await withDbRetry(() =>
        db.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          include: { role: { select: { name: true } } },
        })
      )
    }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = signSessionToken({
      uid: user.id,
      email: user.email,
      role: user.role.name as AppRole,
    })

    const res = NextResponse.json({ success: true, email: user.email, role: user.role.name })
    res.headers.append('Set-Cookie', buildSessionCookie(token))
    return res
  } catch (error) {
    console.error('[API/auth/login POST]', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
