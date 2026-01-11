import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lightweight authentication check - no heavy imports!
// Use next-auth session token directly from cookies

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/pricing',
  '/contact',
  '/help',
  '/terms',
  '/privacy',
  '/about',
  '/features',
  '/templates',
]

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
  const hostname = request.headers.get('host') || ''
  
  // Handle custom domain routing (lightweight check)
  const isCustomDomain = !hostname.includes('localhost') && 
                         !hostname.includes('vercel.app') && 
                         !hostname.includes('buildflow') &&
                         !hostname.startsWith('192.168.') &&
                         !hostname.startsWith('127.0.')
  
  if (isCustomDomain && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/projects/render`
    url.searchParams.set('domain', hostname)
    url.searchParams.set('path', pathname)
    return NextResponse.rewrite(url)
  }
  
  // Skip middleware for API routes and public routes
  if (pathname.startsWith('/api/') || PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  
  if (isProtected) {
    // Lightweight session check - just check if cookies exist
    const sessionToken = request.cookies.get('next-auth.session-token') || 
                        request.cookies.get('__Secure-next-auth.session-token')
    
    if (!sessionToken) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  // Add security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
