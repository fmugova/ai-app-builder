import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use IP address for resend-verification
    const rateLimit = await checkRateLimit(request, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many verification requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Missing email' },
        { status: 400 }
      )
    }
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent account enumeration
    if (user && !user.emailVerified) {
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { email },
        data: { emailVerificationToken, emailVerificationTokenExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24) }
      });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow.ai';
      const verifyUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}`;
      await sendEmail({
        to: email,
        subject: 'Verify your email address',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
        from: 'BuildFlow <noreply@buildflow-ai.app>'
      });
    }
    return NextResponse.json({ success: true, message: 'If that email is registered and unverified, you will receive a verification link.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Resend verification failed' },
      { status: 500 }
    );
  }
}
