import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureAdminProvisioned } from '@/lib/admin-provision'
import { signSessionToken, buildSessionCookie, type AppRole } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim().toLowerCase()
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'aluruhaneef1@gmail.com').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    if (email === adminEmail) {
      await ensureAdminProvisioned()
      const user = await db.user.findUnique({
        where: { email },
        include: { role: { select: { name: true } } },
      })

      const role = (user?.role?.name as AppRole) || 'ADMIN'
      const uid = user?.id || 'admin'

      const token = signSessionToken({
        uid,
        email,
        role,
      })

      const res = NextResponse.json({ success: true, email, role })
      res.headers.append('Set-Cookie', buildSessionCookie(token))
      return res
    }

    // Normal customer or staff check
    const user = await db.user.findUnique({
      where: { email },
      include: { role: { select: { name: true } } },
    })

    if (user) {
      const role = (user.role.name as AppRole)
      const token = signSessionToken({
        uid: user.id,
        email: user.email,
        role,
      })
      const res = NextResponse.json({ success: true, email: user.email, role })
      res.headers.append('Set-Cookie', buildSessionCookie(token))
      return res
    }

    return NextResponse.json({ success: true, email, role: 'CUSTOMER' })
  } catch (error) {
    console.error('[API/auth/session POST]', error)
    return NextResponse.json({ error: 'Session exchange failed' }, { status: 500 })
  }
}
