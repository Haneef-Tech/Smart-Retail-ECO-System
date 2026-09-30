import { NextResponse } from 'next/server'
import { resolveRequester } from '@/lib/auth-guard'

/** Returns the current session's email+role (drives isAdmin gates + redirects). */
/* NOTE: always 200 (never 401) so logged-out polling doesn't spam the
   browser console with "GET /api/auth/me 401" errors. */
export async function GET() {
  const requester = await resolveRequester()
  if (!requester) {
    return NextResponse.json({ authenticated: false, role: null })
  }
  return NextResponse.json({
    authenticated: true,
    email: requester.email,
    role: requester.role,
  })
}
