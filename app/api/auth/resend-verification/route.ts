import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing email.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Do not reveal if user exists
      return NextResponse.json({ success: true })
    }

    // If already verified, do nothing
    if (user.emailVerified) {
      return NextResponse.json({ success: true })
    }

    // Generate new token and expiry
    const emailVerificationToken = require('crypto').randomBytes(32).toString('hex')
    const emailVerificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationTokenExpiry,
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow.ai'
    const verifyUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}`
    const verificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background: #6366f1; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 18px;">Verify Email</a>
        </p>
        <p>If you did not sign up, you can ignore this email.</p>
        <p style="color: #888; font-size: 13px;">This link will expire in 24 hours.</p>
      </div>
    `
    await sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: verificationHtml,
      from: 'BuildFlow <noreply@buildflow-ai.app>'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend verification email error:', error)
    return NextResponse.json({ error: 'Failed to send verification email.' }, { status: 500 })
  }
}
