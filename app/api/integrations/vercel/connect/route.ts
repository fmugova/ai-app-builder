export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Vercel connect - Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user?.email) {
      console.warn('Suspicious request: missing session or email', { ip: request.headers.get('x-forwarded-for') ?? 'unknown', session });
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('callbackUrl', '/settings?connect=vercel')
      return NextResponse.redirect(redirectUrl)
    }

    // Use email as fallback if id is not available
    const userId = session.user.id || session.user.email
    
    // Store userId in a temporary way (we'll use configurationId from callback)
    // For Vercel integrations, state is handled differently
    
    // Build Vercel Integration URL (simpler - Vercel handles OAuth internally)
    const vercelAuthUrl = new URL('https://vercel.com/integrations/buildflow-ai/new')
    
    // Store user mapping temporarily (in production, you'd use Redis or similar)
    // For now, we'll retrieve user from session in callback
    
    return NextResponse.redirect(vercelAuthUrl.toString())
  } catch (error) {
    console.error('Vercel connect error:', error);
    console.warn('Malformed request or error during Vercel connect', { error, ip: request.headers.get('x-forwarded-for') ?? 'unknown' });
    return NextResponse.redirect(new URL('/settings?error=vercel_connect_failed', request.url));
  }
}
