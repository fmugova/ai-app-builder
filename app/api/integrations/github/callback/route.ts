import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { redis } from '@/lib/rate-limit'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.redirect(`${APP_URL}/auth/signin`)
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=no_code`)
    }

    // Validate Redis nonce — prevents CSRF
    if (!state) {
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=invalid_state`)
    }
    const storedUserId = await redis.get<string>(`github:oauth:state:${state}`)
    if (!storedUserId || storedUserId !== session.user.id) {
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=invalid_state`)
    }
    await redis.del(`github:oauth:state:${state}`)

    const githubClientId = process.env.GITHUB_CLIENT_ID
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!githubClientId || !githubClientSecret) {
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=config`)
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: `${APP_URL}/api/integrations/github/callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData)
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=token_exchange`)
    }

    // Fetch GitHub username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    })
    const userData = await userResponse.json()

    if (!userData.login) {
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=user_fetch`)
    }

    // Store encrypted token + username
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubAccessToken: encrypt(tokenData.access_token),
        githubUsername: userData.login,
      },
    })

    return NextResponse.redirect(`${APP_URL}/integrations/github?success=true`)
  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    return NextResponse.redirect(`${APP_URL}/integrations/github?error=token_exchange`)
  }
}
