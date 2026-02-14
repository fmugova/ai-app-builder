import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - use IP address for forgot-password
    const rateLimit = await checkRateLimit(req, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many password reset requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Missing email' },
        { status: 400 }
      )
    }
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent account enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow.ai'}/reset-password?token=${token}`;
      await prisma.user.update({
        where: { email },
        data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60) }
      });
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'BuildFlow <noreply@buildflow.ai>',
        to: email,
        subject: 'Reset your password',
        html: `<p>Hi ${user.name || 'there'},</p><p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
        text: `Hi ${user.name || 'there'},\n\nClick the following link to reset your password: ${resetLink}`
      });
    }
    return NextResponse.json({ success: true, message: 'If that email is registered, you will receive a reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Forgot password failed' },
      { status: 500 }
    );
  }
}
