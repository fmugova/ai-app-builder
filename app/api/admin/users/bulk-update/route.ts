export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userIds, subscriptionTier } = await request.json()

    await prisma.user.updateMany({
      where: {
        id: {
          in: userIds
        }
      },
      data: {
        subscriptionTier
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json(
      { error: 'Failed to update users' },
      { status: 500 }
    )
  }
}