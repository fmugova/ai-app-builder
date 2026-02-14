// This file was migrated from middleware.ts as per Next.js 16+ requirements.
// See: https://nextjs.org/docs/messages/middleware-to-proxy

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  const { pathname } = request.nextUrl;

  // ============================================================================
  // CSRF PROTECTION FOR STATE-CHANGING OPERATIONS
  // ============================================================================
  
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    // Skip CSRF check for specific public endpoints
    const csrfExemptPaths = [
      '/api/auth',
      '/api/forms/submit', // Public form submissions
    ];
    
    const needsCsrfCheck = !csrfExemptPaths.some(path => pathname.startsWith(path));
    
    // For state-changing operations on authenticated routes, verify origin
    if (needsCsrfCheck && token) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const referer = request.headers.get('referer');
      
      // Check if request is from same origin
      const expectedOrigins: string[] = [
        process.env.NEXT_PUBLIC_APP_URL,
        `https://${host}`,
        `http://${host}`,
      ].filter((x): x is string => Boolean(x));

      const isValidOrigin = origin && expectedOrigins.some(expected => 
        origin === expected || origin.startsWith(expected + '/')
      );
      
      // Type-safe referer check
      const isValidReferer = referer ? expectedOrigins.some(expected =>
        (referer as string).startsWith(expected)
      ) : false;

      // Allow requests from same origin or with valid referer
      if (!isValidOrigin && !isValidReferer) {
        console.warn('⚠️ CSRF protection: Invalid origin/referer', {
          path: pathname,
          origin,
          referer,
          method: request.method,
        });
        
        // In production, block the request
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Invalid request origin' },
            { status: 403 }
          );
        }
      }
    }
  }

  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================================================

  // Public paths that don't require authentication or verification
  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/verify-email',
    '/verify-email-notice',
    '/api/auth',
    '/p/', // Public published apps
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
    '/',
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || pathname === '/';

  // If accessing public path, allow
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to signin
  if (!token) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // ✅ EMAIL VERIFICATION ENFORCEMENT ENABLED
  // Check if email is verified (only enforce for new credential signups)
  const emailVerified = token.emailVerified;
  const isCredentialsUser = !token.sub?.includes('google'); // Basic check for OAuth users

  // Only redirect if explicitly not verified (false or specific unverified state)
  // Allow null to pass through (existing users, OAuth users)
  if (emailVerified === false && isCredentialsUser && pathname !== '/verify-email-notice') {
    return NextResponse.redirect(new URL('/verify-email-notice', request.url));
  }

  // If email is verified but trying to access verification notice, redirect to dashboard
  if (emailVerified && pathname === '/verify-email-notice') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
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
};

