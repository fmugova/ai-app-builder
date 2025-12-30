import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all submissions for this user's projects
    const submissions = await prisma.formSubmission.findMany({
      where: {
        userId: user.id
      },
      // Remove 'project' include if 'formSubmission' does not have a 'project' relation
      // If you want to include related data, ensure the relation exists in your Prisma schema
      // include: {
      //   project: {
      //     select: {
      //       id: true,
      //       name: true
      //     }
      //   }
      // },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json({ 
      submissions,
      total: submissions.length 
    })

  } catch (error) {
    console.error('❌ Submissions API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}