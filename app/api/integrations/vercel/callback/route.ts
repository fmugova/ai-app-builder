export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const configurationId = searchParams.get('configurationId')
    const teamId = searchParams.get('teamId')
    const next = searchParams.get('next')

    console.log('Vercel callback received:', { code: !!code, configurationId, teamId, next })

    if (!code) {
      console.error('Missing code')
      return NextResponse.redirect(
        new URL('/settings?error=missing_code', request.url)
      )
    }

    // Get the user from session (they should still be logged in)
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.error('No session found in callback')
      return NextResponse.redirect(
        new URL('/auth/signin?callbackUrl=/settings', request.url)
      )
    }

    const userId = session.user.id || session.user.email

    console.log('Exchanging code for token...')

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_CLIENT_ID!,
        client_secret: process.env.VERCEL_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.VERCEL_REDIRECT_URI!,
      }),
    })

    const tokenData = await tokenResponse.json()

    console.log('Token response status:', tokenResponse.status)

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL('/settings?error=token_exchange_failed', request.url)
      )
    }

    console.log('Token received, fetching user info...')

    // Get user info from Vercel
    const userResponse = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    console.log('User data received:', { 
      username: userData.user?.username, 
      email: userData.user?.email 
    })

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokenData.access_token)
    const encryptedRefreshToken = tokenData.refresh_token 
      ? encrypt(tokenData.refresh_token) 
      : null

    console.log('Storing connection in database...')

    // Store or update connection
    await prisma.vercelConnection.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        teamId: teamId || tokenData.team_id,
        configurationId: configurationId,
        username: userData.user?.username,
        email: userData.user?.email,
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        teamId: teamId || tokenData.team_id,
        configurationId: configurationId,
        username: userData.user?.username,
        email: userData.user?.email,
        updatedAt: new Date(),
      },
    })

    console.log('Connection stored successfully')

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings?vercel_connected=true', request.url)
    )
  } catch (error) {
    console.error('Vercel callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?error=vercel_callback_failed', request.url)
    )
  }
}
