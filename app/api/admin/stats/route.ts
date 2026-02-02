// app/api/admin/stats/route.ts
// ⚠️ This file makes your admin dashboard show REAL numbers instead of zeros

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // ✅ Fetch real counts from database
    const [totalUsers, totalProjects, totalGenerations, activeUsersToday] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total projects
      prisma.project.count(),

      // Total AI generations (sum of all users' generationsUsed)
      prisma.user.aggregate({
        _sum: {
          generationsUsed: true
        }
      }).then(result => result._sum.generationsUsed || 0),

      // Active users today (users who have activities today)
      prisma.activity.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)) // Start of today
          }
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      }).then(results => results.length)
    ])

    // Return stats object
    return NextResponse.json({
      totalUsers,
      totalProjects,
      totalGenerations,
      activeUsers: activeUsersToday
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}