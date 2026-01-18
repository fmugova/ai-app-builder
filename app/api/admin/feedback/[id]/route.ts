export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { response, status } = await request.json()

    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        response,
        status
      }
    })

    return NextResponse.json(updatedFeedback)
  } catch (error) {
    console.error('Feedback response error:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}