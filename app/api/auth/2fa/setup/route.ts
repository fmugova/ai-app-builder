export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent re-setup if already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Please disable it first to set up again.' },
        { status: 400 }
      )
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `BuildFlow AI (${user.email})`,
      issuer: 'BuildFlow AI'
    })

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!)

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () => {
      return randomBytes(4).toString('hex').toUpperCase()
    })

    // Store secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorBackupCodes: backupCodes, // In production, encrypt these!
        twoFactorEnabled: false // Not enabled until verified
      }
    })

    return NextResponse.json({
      secret: secret.base32,
      qrCode,
      backupCodes,
      message: 'Scan the QR code with your authenticator app'
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}
