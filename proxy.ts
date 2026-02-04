// This file was migrated from middleware.ts as per Next.js 16+ requirements.
// See: https://nextjs.org/docs/messages/middleware-to-proxy

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  const { pathname } = request.nextUrl;

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
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

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

  // Check if email is verified
  const emailVerified = token.emailVerified;

  // If email not verified and not already on verification notice page
  if (!emailVerified && pathname !== '/verify-email-notice') {
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

