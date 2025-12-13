export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get stats
    const [totalUsers, totalProjects, activeSubscriptions, totalGenerations] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.user.count({
        where: {
          subscriptionTier: {
            not: 'free'
          },
          subscriptionStatus: 'active'
        }
      }),
      prisma.user.aggregate({
        _sum: {
          generationsUsed: true
        }
      })
    ])

    return NextResponse.json({
      totalUsers,
      totalProjects,
      activeSubscriptions,
      totalGenerations: totalGenerations._sum.generationsUsed || 0
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}