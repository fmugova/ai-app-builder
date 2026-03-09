import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redis } from '@/lib/rate-limit'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.redirect(`${APP_URL}/auth/signin`)
    }

    const githubClientId = process.env.GITHUB_CLIENT_ID

    if (!githubClientId) {
      return NextResponse.redirect(`${APP_URL}/integrations/github?error=config`)
    }

    // Generate a short-lived nonce; store userId so callback can verify the session
    const nonce = crypto.randomUUID()
    await redis.set(`github:oauth:state:${nonce}`, session.user.id, { ex: 300 })

    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: `${APP_URL}/api/integrations/github/callback`,
      scope: 'repo,user:email',
      state: nonce,
    })

    return NextResponse.redirect(
      `https://github.com/login/oauth/authorize?${params.toString()}`
    )
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error)
    return NextResponse.redirect(`${APP_URL}/integrations/github?error=config`)
  }
}
