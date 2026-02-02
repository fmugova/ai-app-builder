// app/api/admin/stats/route.ts
// ✅ FIXED: Converts BigInt to Number before JSON serialization

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [totalUsers, totalProjects, generationsResult, activeUsersToday] = await Promise.all([
      prisma.user.count(),

      prisma.project.count(),

      // ✅ FIX: Get the aggregate result
      prisma.user.aggregate({
        _sum: {
          generationsUsed: true
        }
      }),

      prisma.activity.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      }).then(results => results.length)
    ])

    // ✅ FIX: Convert BigInt to Number before returning
    const totalGenerations = Number(generationsResult._sum.generationsUsed || 0)

    return NextResponse.json({
      totalUsers,
      totalProjects,
      totalGenerations,  // Now it's a regular number, not BigInt
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