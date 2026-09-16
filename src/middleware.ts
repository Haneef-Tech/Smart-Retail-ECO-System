import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'aluruhaneef1@gmail.com'

// Routes that require any logged-in user
const PROTECTED_ROUTES = ['/checkout', '/orders', '/profile', '/order-success']

// Routes that require admin
const ADMIN_ROUTES = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('firebase-token')?.value

  // Admin routes - check if user is admin (we do email check client-side too)
  // For server-side admin guard, we rely on /admin/layout.tsx server component
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return NextResponse.next()
  }

  // Protected customer routes - require login
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/checkout/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/order-success/:path*',
    '/admin/:path*',
  ],
}

