export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get user with stats
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        projectsThisMonth: true,
        projectsLimit: true,
        generationsUsed: true,
        generationsLimit: true,
        subscriptionTier: true,
        subscriptionStatus: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('User stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}