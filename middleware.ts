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
  const isPreview = request.nextUrl.pathname.startsWith('/preview') || 
                    request.nextUrl.pathname.startsWith('/api/preview')

  const isDevelopment = process.env.NODE_ENV === 'development'

  let csp: string

  if (isPreview || isDevelopment) {
    // Permissive CSP for generated sites and development
    csp = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.jsdelivr.net;
      script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https:;
      font-src 'self' data: https:;
      connect-src 'self' https:;
      frame-src 'self' https:;
    `.replace(/\s{2,}/g, ' ').trim()
  } else {
    // Stricter CSP for your main app pages
    csp = `
      default-src 'self';
      script-src 'self';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https:;
      font-src 'self' data:;
      connect-src 'self' https:;
    `.replace(/\s{2,}/g, ' ').trim()
  }

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
