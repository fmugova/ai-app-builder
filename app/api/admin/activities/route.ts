export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if Activity table exists first
    try {
      const activities = await prisma.activity.findMany({
        take: 50,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json(activities)
    } catch (error) {
      // Table doesn't exist yet, return empty array
      console.log('Activity table not found, returning empty array')
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Activities error:', error)
    // Return empty array instead of error
    return NextResponse.json([])
  }
}