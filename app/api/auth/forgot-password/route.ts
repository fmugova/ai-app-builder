import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Send email via Resend
    try {
      const emailResult = await resend.emails.send({
        from: 'BuildFlow <noreply@buildflow-ai.app>',
        to: email,
        subject: 'Reset Your Password - BuildFlow',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
      <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 32px;">🔑</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Hi ${user.name || 'there'},
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        We received a request to reset your password for your BuildFlow account. Click the button below to create a new password:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        Or copy and paste this link into your browser:
      </p>
      
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563; margin: 8px 0 20px 0;">
        ${resetLink}
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 10px 0;">
          ⏱️ This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 BuildFlow. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `,
      })

      console.log(`✅ Password reset email sent successfully to ${email}`)
      console.log(`📧 Resend Email ID: ${emailResult.data?.id}`)
    } catch (emailError) {
      console.error('❌ Failed to send email via Resend:', emailError)
      // Don't fail the request if email fails - user can still use console link in dev
      if (process.env.NODE_ENV === 'production') {
        throw emailError
      }
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
