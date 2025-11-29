export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'No session',
        session: session 
      })
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
        error: 'User not found',
        email: session.user.email 
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        projectCount: user.Project.length,
      },
      projects: user.Project,
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
