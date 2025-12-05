export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { response, status } = body

    // Update feedback
    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        response,
        status,
        updatedAt: new Date()
      }
    })

    // Get admin user ID
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    // Log activity
    if (adminUser) {
      await prisma.activity.create({
        data: {
          userId: adminUser.id,
          type: 'feedback_response',
          action: 'Feedback Responded',
          metadata: {
            feedbackId: id,
            status
          }
        }
      })
    }

    return NextResponse.json(updatedFeedback)
  } catch (error) {
    console.error('Feedback response error:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}