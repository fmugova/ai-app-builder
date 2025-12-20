
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // TODO: Integrate with your email service (SendGrid, Resend, etc.)
    // For now, just log it
    console.log('📧 Email to send:', {
      to: user.email,
      subject,
      message
    })

    // If you have an email service configured:
    // await sendEmail({
    //   to: user.email,
    //   subject,
    //   html: message
    // })

    // For now, just return success
    return NextResponse.json({ 
      success: true,
      message: 'Email queued for sending (email service not configured)'
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}