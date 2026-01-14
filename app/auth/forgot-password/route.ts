import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`⚠️  Password reset requested for non-existent email: ${email}`)
      return NextResponse.json({
        message: 'If that email exists, a reset link has been sent',
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Create reset link
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80))
      console.log('🔑 PASSWORD RESET LINK (DEV MODE)')
      console.log('='.repeat(80))
      console.log(`Email: ${email}`)
      console.log(`Link:  ${resetLink}`)
      console.log(`Expires: ${resetTokenExpiry.toLocaleString()}`)
      console.log('='.repeat(80) + '\n')
    }

    // In production, send email (you can add email service later)
    // TODO: Integrate with SendGrid, Resend, or other email service
    if (process.env.NODE_ENV === 'production') {
      // await sendPasswordResetEmail(email, resetLink)
      console.log(`📧 Would send password reset email to: ${email}`)
    }

    return NextResponse.json({
      message: 'If that email exists, a reset link has been sent',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}