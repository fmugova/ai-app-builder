import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const SUPABASE_CLIENT_ID = process.env.SUPABASE_CLIENT_ID!
const SUPABASE_CLIENT_SECRET = process.env.SUPABASE_CLIENT_SECRET!
const SUPABASE_REDIRECT_URI = process.env.SUPABASE_REDIRECT_URI || 'http://localhost:3000/api/integrations/supabase/callback'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Supabase OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard?error=supabase_auth_failed&message=${error}`, request.url)
      )
    }

    // Verify state matches user email
    if (state !== session.user.email) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_state', request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_code', request.url)
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.supabase.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: SUPABASE_CLIENT_ID,
        client_secret: SUPABASE_CLIENT_SECRET,
        redirect_uri: SUPABASE_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Supabase token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL('/dashboard?error=token_exchange_failed', request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Supabase API
    const userResponse = await fetch('https://api.supabase.com/v1/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    let supabaseUser: any = {}
    if (userResponse.ok) {
      supabaseUser = await userResponse.json()
    }

    // Find or create user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.redirect(
        new URL('/dashboard?error=user_not_found', request.url)
      )
    }

    // Store Supabase integration
    await prisma.supabaseIntegration.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        organizationId: supabaseUser.organization_id,
        username: supabaseUser.username,
        email: supabaseUser.email,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        organizationId: supabaseUser.organization_id,
        username: supabaseUser.username,
        email: supabaseUser.email,
        updatedAt: new Date(),
      },
    })

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?supabase_connected=true', request.url)
    )
  } catch (error: any) {
    console.error('Supabase callback error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=supabase_callback_failed&message=${error.message}`, request.url)
    )
  }
}
