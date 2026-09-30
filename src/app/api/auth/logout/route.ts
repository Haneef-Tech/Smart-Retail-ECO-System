import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth-guard'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.headers.append('Set-Cookie', clearSessionCookie())
  return res
}
