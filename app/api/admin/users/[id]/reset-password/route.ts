export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// Cryptographically secure password generator (replaces Math.random)
function generatePassword(): string {
  return randomBytes(16).toString('base64url').slice(0, 20)
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const newPassword = body.newPassword || generatePassword()

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { email: true, name: true },
    })

    // Send the temporary password to the user's email — never return it in the response
    await sendEmail({
      to: user.email!,
      subject: 'Your password has been reset',
      html: `
        <p>Hi ${user.name || 'there'},</p>
        <p>An administrator has reset your BuildFlow password.</p>
        <p>Your temporary password is: <strong>${newPassword}</strong></p>
        <p>Please sign in and change your password immediately.</p>
      `,
    }).catch((err) => {
      console.error('[admin reset-password] Failed to send email:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
