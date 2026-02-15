import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Routes that require a logged-in session
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

// Admin-only routes
const ADMIN_PREFIXES = ['/admin']

// Mutation methods that need CSRF origin checking
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Routes that legitimately receive cross-origin POST requests (webhooks, public APIs)
const CSRF_EXEMPT_PREFIXES = [
  '/api/stripe/webhook',       // Stripe — verified by signature
  '/api/auth',                 // NextAuth — has its own CSRF
  '/api/analytics/track',      // Public analytics (intentionally cross-origin)
  '/api/newsletter',           // Public newsletter opt-in/out
  '/api/forms',                // Public contact forms
  '/api/cron',                 // Cron jobs — authenticated by CRON_SECRET Bearer token
]

// Paths that bypass maintenance mode (so the maintenance page itself loads + admin can disable)
const MAINTENANCE_BYPASS_PREFIXES = [
  '/maintenance',
  '/api/admin/maintenance',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/auth/',
]

/**
 * Check if maintenance mode is active via Upstash REST API.
 * Returns null (pass-through) or a redirect to /maintenance.
 * Only runs if UPSTASH_REDIS_REST_URL is configured.
 */
async function maintenanceModeCheck(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl

  // Bypass for essential routes
  if (MAINTENANCE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return null

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!redisUrl || !redisToken) return null

  try {
    const res = await fetch(`${redisUrl}/get/maintenance:enabled`, {
      headers: { Authorization: `Bearer ${redisToken}` },
      // Short timeout — don't slow all requests on Redis hiccup
      signal: AbortSignal.timeout(500),
    })
    if (!res.ok) return null
    const data = await res.json() as { result: string | null }
    if (data.result !== '1') return null

    // Admins can still access the site during maintenance
    // (token check happens after maintenance check — admin bypass via cookie)
    // We can't call getServerSession in middleware, so admins get a link on the maintenance page

    return NextResponse.redirect(new URL('/maintenance', req.url))
  } catch {
    // Redis unreachable — fail open (don't block all traffic)
    return null
  }
}

function csrfOriginCheck(req: Parameters<typeof withAuth>[0]): NextResponse | null {
  if (!UNSAFE_METHODS.has(req.method)) return null
  const { pathname } = req.nextUrl
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return null

  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://buildflow-ai.app'

  let allowedOrigin: string
  try {
    const u = new URL(appUrl)
    allowedOrigin = `${u.protocol}//${u.host}`
  } catch {
    allowedOrigin = appUrl.replace(/\/$/, '')
  }

  const isDev = process.env.NODE_ENV === 'development'
  const origin = req.headers.get('origin')

  if (!origin) return null  // server-to-server or same-origin without Origin header

  if (origin === allowedOrigin) return null
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return null

  console.warn(`[csrf] Blocked ${req.method} ${pathname} from origin: ${origin}`)
  return NextResponse.json(
    { error: 'CSRF check failed: unexpected origin' },
    { status: 403 }
  )
}

const authMiddleware = withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // CSRF origin check for all state-changing requests
    const csrfBlock = csrfOriginCheck(req)
    if (csrfBlock) return csrfBlock

    // Admin guard
    if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // withAuth only runs the middleware function when this returns true
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
        if (!needsAuth) return true
        return !!token
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
)

export default async function middleware(req: NextRequest) {
  // Maintenance mode check runs before auth — redirects all non-bypass traffic
  const maintenanceRedirect = await maintenanceModeCheck(req)
  if (maintenanceRedirect) return maintenanceRedirect

  // Delegate to the auth middleware for everything else
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (authMiddleware as any)(req)
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static / _next/image (Next.js internals)
     * - favicon.ico, public assets
     * - /auth/* (sign-in / sign-up pages themselves)
     * - /api/auth/* (NextAuth endpoints)
     * - /p/* (public published sites)
     * - /.well-known/*
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)|auth/|api/auth/|p/|\\.well-known/).*)',
  ],
}
