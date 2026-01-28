import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing token.' }, { status: 400 })
    }

    // Find user with matching token and not expired
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: {
          gte: new Date()
        },
        emailVerified: null
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 400 })
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null
      }
    })

    return NextResponse.json({ success: true, message: 'Email verified successfully.' })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Failed to verify email.' }, { status: 500 })
  }
}
