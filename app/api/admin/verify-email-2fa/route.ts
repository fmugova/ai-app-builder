import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Verify email if not already
  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  }

  // Always generate a new 2FA secret for maximum security
  const secret = speakeasy.generateSecret({ name: `AI App Builder (${user.email})` });
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret.base32 } });
  const twoFASecret = secret.base32;

  // Generate QR code URL
  const otpauth = speakeasy.otpauthURL({
    secret: twoFASecret,
    label: user.email,
    issuer: 'AI App Builder',
    encoding: 'base32',
  });

  return NextResponse.json({
    success: true,
    emailVerified: true,
    twoFA: true,
    otpauth,
    secret: twoFASecret,
  });
}
