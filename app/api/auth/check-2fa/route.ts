import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import speakeasy from 'speakeasy'  // ✅ More reliable alternative

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - use IP address for 2FA check
    const rateLimit = await checkRateLimit(req, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${resetIn} seconds` },
        { status: 429 }
      )
    }

    // Get session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with 2FA secret
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    })

    // If 2FA is not enabled, allow login
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ success: true })
    }

    // If 2FA is enabled, require token
    const body = await req.json()
    const { token } = body

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    // Verify token using speakeasy
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock skew (consistent with all other 2FA routes)
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Token is valid
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify 2FA token' },
      { status: 500 }
    )
  }
}