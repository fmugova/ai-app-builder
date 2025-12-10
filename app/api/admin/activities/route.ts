export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get ALL recent activities from ALL users (no userId filter)
    const activities = await prisma.activity.findMany({
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Get last 100 activities
    })

    console.log(`[Admin Activities] Found ${activities.length} activities from ${new Set(activities.map(a => a.userId)).size} unique users`)

    // Transform to match expected format
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      action: activity.action,
      details: activity.metadata ? JSON.stringify(activity.metadata) : activity.action,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      user: activity.User
    }))

    return NextResponse.json(transformedActivities)
  } catch (error) {
    console.error('Activities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}