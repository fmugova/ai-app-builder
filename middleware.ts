import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lightweight authentication check - minimal logic for best performance

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/workspaces',
  '/billing',
  '/settings',
  '/account',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (isProtected) {
    // Lightweight session check - just check if session cookie exists
    const sessionToken = request.cookies.get('next-auth.session-token') ||
      request.cookies.get('__Secure-next-auth.session-token')

    if (!sessionToken) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  // --- CSP HEADER LOGIC ---
  const response = NextResponse.next()
  const isDev = process.env.NODE_ENV === 'development'
  const csp = isDev
    ? `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';`.replace(/\s{2,}/g, ' ').trim()
    : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:;`.replace(/\s{2,}/g, ' ').trim()
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/workspaces/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/account/:path*',
  ],
}
