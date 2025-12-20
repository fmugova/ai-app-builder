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
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get stats
    const [totalUsers, totalProjects, totalGenerations] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.user.aggregate({
        _sum: {
          generationsUsed: true
        }
      })
    ])

    // Get active users (logged in within last 24 hours)
    const activeUsers = await prisma.user.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    return NextResponse.json({
      totalUsers,
      totalProjects,
      totalGenerations: totalGenerations._sum.generationsUsed || 0,
      activeUsers
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}