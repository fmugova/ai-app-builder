export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Admin emails for debug access
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []

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
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ 
        error: 'Forbidden - Admin access required'
      }, { status: 403 })
    }

    // Test database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        Project: true,
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
        projectCount: user.Project.length,
      },
      projects: user.Project.map(p => ({ id: p.id, name: p.name })),
    })

  } catch (error: any) {
    // Don't expose error details in production
    console.error('Debug route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
  }
}
