export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/rate-limit'
import * as speakeasy from 'speakeasy'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'No 2FA setup found' },
        { status: 400 }
      )
    }

    // Replay protection: reject a token that has already been used
    const replayKey = `totp:used:${user.id}:${token}`
    if (await redis.get(replayKey)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1  // ±30s — was 2 (±60s replay window)
    })

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      )
    }

    // Mark token as used for 90s so it cannot be replayed
    await redis.set(replayKey, '1', { ex: 90 })

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true
      }
    })

    // Log security event
    try {
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: '2FA_ENABLED',
          action: 'success',
          severity: 'info',
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      })
    } catch (logError) {
      console.error('Failed to log security event:', logError)
    }

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    )
  }
}
