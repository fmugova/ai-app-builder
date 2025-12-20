export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    // Test session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized - No session'
      }, { status: 401 })
    }

    // Only allow admins to access debug info
    if (!isAdmin(session.user.email)) {
      return NextResponse.json({ 
        error: 'Forbidden - Admin access required'
      }, { status: 403 })
    }

    // Test database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        projects: true,
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        projectCount: user.projects.length,
      },
      projects: user.projects.map(p => ({ id: p.id, name: p.name })),
    })

  } catch (error: any) {
    // Don't expose error details in production
    console.error('Debug route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}
