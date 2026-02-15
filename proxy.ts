/**
 * Next.js Proxy (replaces middleware.ts in Next.js 16+)
 * Handles: maintenance mode, CSRF, auth protection, admin guard, email verification.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// ── Routes that require a logged-in session ──────────────────────────────────
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/chatbuilder',
  '/builder',
  '/account',
  '/billing',
  '/checkout',
  '/analytics',
  '/admin',
]

// ── Admin-only routes ─────────────────────────────────────────────────────────
const ADMIN_PREFIXES = ['/admin']

// ── Mutation methods that need CSRF origin checking ───────────────────────────
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ── Routes that legitimately receive cross-origin POST requests ───────────────
const CSRF_EXEMPT_PREFIXES = [
  '/api/stripe/webhook',       // Stripe — verified by signature
  '/api/auth',                 // NextAuth — has its own CSRF
  '/api/analytics/track',      // Public analytics (intentionally cross-origin)
  '/api/newsletter',           // Public newsletter opt-in/out
  '/api/forms',                // Public contact forms (user-generated sites)
  '/api/cron',                 // Cron jobs — authenticated by CRON_SECRET Bearer token
  '/api/email/inbound',        // Resend inbound webhook — verified by signature
]

// ── Paths that bypass maintenance mode ────────────────────────────────────────
const MAINTENANCE_BYPASS_PREFIXES = [
  '/maintenance',
  '/api/admin/maintenance',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/auth/',
]

// ── Public paths (no auth required) ──────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/verify-email',
  '/verify-email-notice',
  '/api/auth',
  '/p/',
  '/_next',
  '/favicon.ico',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/pricing',
  '/features',
  '/examples',
  '/templates',
  '/api/health',
  '/api/contact',       // Public contact form
  '/api/newsletter',    // Public newsletter sign-up
  '/api/forms',         // User-generated site forms
  '/maintenance',
]

// ── Maintenance mode check (Upstash REST) ─────────────────────────────────────
async function maintenanceModeCheck(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl
  if (MAINTENANCE_BYPASS_PREFIXES.some(p => pathname.startsWith(p))) return null

  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!redisUrl || !redisToken) return null

  try {
    const res = await fetch(`${redisUrl}/get/maintenance:enabled`, {
      headers: { Authorization: `Bearer ${redisToken}` },
      signal: AbortSignal.timeout(500),
    })
    if (!res.ok) return null
    const data = await res.json() as { result: string | null }
    if (data.result !== '1') return null
    return NextResponse.redirect(new URL('/maintenance', req.url))
  } catch {
    return null // fail open
  }
}

// ── CSRF origin check ─────────────────────────────────────────────────────────
function csrfOriginCheck(req: NextRequest): NextResponse | null {
  if (!UNSAFE_METHODS.has(req.method)) return null
  const { pathname } = req.nextUrl
  if (CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))) return null

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow-ai.app'
  let allowedOrigin: string
  try {
    const u = new URL(appUrl)
    allowedOrigin = `${u.protocol}//${u.host}`
  } catch {
    allowedOrigin = appUrl.replace(/\/$/, '')
  }

  const isDev = process.env.NODE_ENV === 'development'
  const origin = req.headers.get('origin')
  if (!origin) return null
  if (origin === allowedOrigin) return null
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return null

  console.warn(`[csrf] Blocked ${req.method} ${pathname} from origin: ${origin}`)
  return NextResponse.json({ error: 'CSRF check failed: unexpected origin' }, { status: 403 })
}

// ── Main proxy function ───────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Maintenance mode — runs before everything
  const maintenanceRedirect = await maintenanceModeCheck(request)
  if (maintenanceRedirect) return maintenanceRedirect

  // 2. CSRF check for state-changing requests
  const csrfBlock = csrfOriginCheck(request)
  if (csrfBlock) return csrfBlock

  // 3. Skip auth for public paths
  const isPublicPath = PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || pathname === '/'
  if (isPublicPath) return NextResponse.next()

  // 4. Require authentication for protected routes
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const needsAuth = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))

  if (needsAuth && !token) {
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  if (token) {
    // 5. Admin guard
    if (ADMIN_PREFIXES.some(p => pathname.startsWith(p))) {
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 6. Email verification enforcement
    const emailVerified = token.emailVerified
    const isOAuth = token.sub?.includes('google') || token.sub?.includes('github')

    if (emailVerified === null && !isOAuth && pathname !== '/verify-email-notice') {
      return NextResponse.redirect(new URL('/verify-email-notice', request.url))
    }
    if (emailVerified && pathname === '/verify-email-notice') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)|auth/|api/auth/|p/|\\.well-known/).*)',
  ],
}
