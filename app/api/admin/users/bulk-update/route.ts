export const dynamic = 'force-dynamic'


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

    const { userIds, subscriptionTier } = await request.json()

    const VALID_TIERS = ['free', 'pro', 'business', 'enterprise']
    if (!subscriptionTier || !VALID_TIERS.includes(subscriptionTier)) {
      return NextResponse.json({ error: 'Invalid subscriptionTier value' }, { status: 400 })
    }
    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 500) {
      return NextResponse.json({ error: 'userIds must be an array of 1–500 IDs' }, { status: 400 })
    }

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { subscriptionTier }
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
