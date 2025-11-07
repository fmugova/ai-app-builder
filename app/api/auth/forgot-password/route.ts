import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store token in database
      await prisma.verificationToken.create({
        data: {
          identifier: email.toLowerCase(),
          token: resetToken,
          expires: resetTokenExpiry,
        },
      });

      // In production, you would send an email here
      // For now, we'll log the reset link
      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

      console.log('Password reset link:', resetUrl);
      console.log('For user:', email);

      // TODO: Send email using a service like Resend, SendGrid, etc.
      // Example:
      // await sendEmail({
      //   to: email,
      //   subject: 'Reset Your Buildflow Password',
      //   html: `Click here to reset your password: ${resetUrl}`
      // });
    }

    // Always return success
    return NextResponse.json({
      message: 'If an account exists with that email, you will receive a password reset link shortly.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
