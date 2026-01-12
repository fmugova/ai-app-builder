import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        password: true,
        twoFactorEnabled: true,
        emailVerified: true,
      },
    })

    if (!user || !user.password) {
      // Don't reveal if user exists
      return NextResponse.json({ requires2FA: false })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ requires2FA: false })
    }

    // Return 2FA status regardless of email verification
    // Let the main auth flow handle email verification
    return NextResponse.json({
      requires2FA: user.twoFactorEnabled,
      emailVerified: user.emailVerified,
    })
  } catch (error) {
    console.error('2FA check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
