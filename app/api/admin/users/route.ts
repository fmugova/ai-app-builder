export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all users with their stats and actual project count
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        projectsThisMonth: true,
        generationsUsed: true,
        generationsLimit: true,
        projectsLimit: true,
        createdAt: true,
        role: true,
        _count: {
          select: {
            Project: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to include actual project count
    const usersWithProjectCount = users.map(user => ({
      ...user,
      projectCount: user._count.Project,
      _count: undefined
    }))

    return NextResponse.json(usersWithProjectCount)
  } catch (error) {
    console.error('Users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}