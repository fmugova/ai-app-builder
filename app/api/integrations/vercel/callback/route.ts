export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const configurationId = searchParams.get('configurationId')
    const teamId = searchParams.get('teamId')

    console.log('Vercel callback received:', { code: !!code, state: !!state, configurationId, teamId })

    if (!code || !state) {
      console.error('Missing code or state')
      return NextResponse.redirect(
        new URL('/settings?error=missing_oauth_params', request.url)
      )
    }

    // Verify and decode state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch (e) {
      console.error('Invalid state format:', e)
      return NextResponse.redirect(
        new URL('/settings?error=invalid_state', request.url)
      )
    }

    const userId = stateData.userId
    const timestamp = stateData.timestamp

    // Check if state is not too old (15 minutes max)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      console.error('State expired')
      return NextResponse.redirect(
        new URL('/settings?error=oauth_expired', request.url)
      )
    }

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
