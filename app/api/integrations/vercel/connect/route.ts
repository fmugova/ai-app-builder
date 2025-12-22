export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Vercel connect - Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user?.email) {
      console.log('No session found, redirecting to signin')
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('callbackUrl', '/settings?connect=vercel')
      return NextResponse.redirect(redirectUrl)
    }

    // Use email as fallback if id is not available
    const userId = session.user.id || session.user.email
    
    // Create state with user info for verification
    const state = Buffer.from(JSON.stringify({
      userId: userId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    })).toString('base64url')

    // Build Vercel OAuth URL
    const vercelAuthUrl = new URL('https://vercel.com/integrations/buildflow-ai/new')
    vercelAuthUrl.searchParams.set('client_id', process.env.VERCEL_CLIENT_ID!)
    vercelAuthUrl.searchParams.set('redirect_uri', process.env.VERCEL_REDIRECT_URI!)
    vercelAuthUrl.searchParams.set('state', state)

    return NextResponse.redirect(vercelAuthUrl.toString())
  } catch (error) {
    console.error('Vercel connect error:', error)
    return NextResponse.redirect(new URL('/settings?error=vercel_connect_failed', request.url))
  }
}
