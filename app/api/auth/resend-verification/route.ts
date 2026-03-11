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
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // If user not found or already verified — return generic success to prevent enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'If that email is registered and unverified, you will receive a verification link.',
      })
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { email },
      data: {
        emailVerificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow-ai.app').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(email)}`;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Verify your BuildFlow email address',
      from: 'BuildFlow <noreply@buildflow-ai.app>',
      html: getVerificationEmailHTML(verifyUrl),
    });

    if (!emailResult.success) {
      console.error('[resend-verification] Email delivery failed for', email, ':', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later or contact support@buildflow-ai.app.' },
        { status: 500 }
      );
    }

    console.log('[resend-verification] Verification email sent to', email);
    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Check your inbox (and spam folder).',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Resend verification failed' },
      { status: 500 }
    );
  }
}

function getVerificationEmailHTML(verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email — BuildFlow</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;">Verify Your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <p style="margin:0 0 20px 0;color:#333333;font-size:16px;line-height:1.6;">
                Thanks for signing up for BuildFlow! Please verify your email address by clicking the button below.
              </p>
              <div style="text-align:center;margin:30px 0;">
                <a href="${verifyUrl}"
                   style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:20px 0 0 0;color:#666666;font-size:14px;line-height:1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color:#667eea;word-break:break-all;">${verifyUrl}</a>
              </p>
              <p style="margin:20px 0 0 0;color:#999999;font-size:13px;">
                This link expires in 24 hours. If you didn't create a BuildFlow account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:24px 30px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 8px 0;color:#999999;font-size:13px;">BuildFlow — Build beautiful apps with AI</p>
              <p style="margin:0;color:#999999;font-size:12px;">
                Questions? <a href="mailto:support@buildflow-ai.app" style="color:#667eea;">support@buildflow-ai.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
