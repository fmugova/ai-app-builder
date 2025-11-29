export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        aiRequestsUsed: true,
        aiRequestsLimit: true,
        subscriptionPlan: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      usage: {
        used: user.aiRequestsUsed || 0,
        limit: user.aiRequestsLimit || 10,
        plan: user.subscriptionPlan || 'free',
        remaining: (user.aiRequestsLimit || 10) - (user.aiRequestsUsed || 0),
      },
    })
  } catch (error) {
    console.error('Usage error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}