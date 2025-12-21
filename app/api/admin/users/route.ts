export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Debug logging
    console.log('Session:', JSON.stringify(session, null, 2))
    console.log('User role:', session?.user?.role)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    if (session.user.role !== 'admin') {
      console.log('Access denied - not admin:', session.user.email, 'Role:', session.user.role)
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    // Get all users with their stats and actual project count
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        projectsThisMonth: true,
        generationsUsed: true,
        _count: {
          select: { projects: true }
        }
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}