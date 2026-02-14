export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as speakeasy from 'speakeasy'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: max 5 attempts per 15-minute window per user
    const rateLimit = await checkRateLimit(req, 'auth', session.user.id)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many regeneration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled on this account' },
        { status: 400 }
      )
    }

    // Verify TOTP token before regenerating codes
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Generate 10 new backup codes — 10 bytes = 80-bit entropy (plaintext returned once, hashed for storage)
    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(10).toString('hex').toUpperCase()
    )
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    )

    // Update user with hashed backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorBackupCodes: hashedBackupCodes
      }
    })

    return NextResponse.json({
      success: true,
      backupCodes, // plaintext shown once to user
      message: 'Backup codes regenerated successfully'
    })
  } catch (error) {
    console.error('Backup codes regeneration error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    )
  }
}
