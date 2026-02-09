import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId, subject, message } = await request.json()

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send email using email service
    const { sendEmail } = await import('@/lib/email-service')
    const result = await sendEmail({
      to: user.email,
      subject,
      html: message,
      text: message.replace(/<[^>]*>/g, '') // Strip HTML for text version
    })

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to send email',
        details: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    })
  } catch (error) {
    console.error('Send email error:', error)
    const Sentry = (await import('@/lib/sentry')).default
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
