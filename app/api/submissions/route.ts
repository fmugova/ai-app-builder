import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ✅ Force dynamic route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all form submissions for this user's projects
    const submissions = await prisma.formSubmission.findMany({
      where: {
        userId: user.id
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'  // ✅ Changed from createdAt to submittedAt
      },
      take: 100 // Limit to 100 most recent
    })

    return NextResponse.json({ 
      submissions,
      total: submissions.length 
    })

  } catch (error: any) {
    console.error('❌ Submissions API error:', error)
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Failed to fetch submissions',
        message: error.message,
        type: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}