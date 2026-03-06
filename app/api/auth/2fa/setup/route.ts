export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { totpGenerateSecret, totpKeyUri } from '@/lib/totp'
import * as QRCode from 'qrcode'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

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
    const secretBase32 = totpGenerateSecret()
    const otpauthUrl = totpKeyUri(user.email, 'BuildFlow AI', secretBase32)

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    // Generate 10 backup codes — 10 bytes = 80-bit entropy (plaintext returned once, hashed for storage)
    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(10).toString('hex').toUpperCase()
    )
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    )

    // Store secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secretBase32,
        twoFactorBackupCodes: hashedBackupCodes,
        twoFactorEnabled: false // Not enabled until verified
      }
    })

    return NextResponse.json({
      secret: secretBase32,
      qrCode,
      backupCodes, // plaintext shown once to user
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
