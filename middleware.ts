import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Define route protection levels
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/verify-request',
  '/pricing',
  '/contact',
  '/help',
  '/terms',
  '/privacy',
  '/api/auth',
]

const ADMIN_ROUTES = [
  '/admin',
]

const PRO_ROUTES = [
  '/dashboard/database',
  '/dashboard/domains',
]

const CUSTOM_PROTECTED_ROUTES = [
  '/my-custom-route',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow public API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to signin if not authenticated
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Check admin routes
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=Unauthorized', request.url))
    }
  }

  // Check pro routes (require active subscription)
  if (PRO_ROUTES.some(route => pathname.startsWith(route))) {
    const tier = token.subscriptionTier as string
    if (tier === 'free') {
      return NextResponse.redirect(new URL('/pricing?upgrade=required', request.url))
    }
  }

  // Check custom protected routes
  if (CUSTOM_PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    // Add your custom logic here
    // Example: Check email verification
    if (!token.emailVerified) {
      return NextResponse.redirect(new URL('/auth/verify-request?error=EmailNotVerified', request.url))
    }
    
    // Example: Check specific subscription status
    const subscriptionStatus = token.subscriptionStatus as string
    if (subscriptionStatus !== 'active') {
      return NextResponse.redirect(new URL('/pricing?error=InactiveSubscription', request.url))
    }
    
    // Example: Check usage limits
    const projectsThisMonth = token.projectsThisMonth as number
    if (projectsThisMonth >= 100) {
      return NextResponse.redirect(new URL('/dashboard?error=UsageLimitReached', request.url))
    }
  }

  // Add security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
