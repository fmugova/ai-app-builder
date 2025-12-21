export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Check GitHub connection status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        githubAccessToken: true, 
        githubUsername: true 
      }
    })

    return NextResponse.json({
      connected: !!user?.githubAccessToken,
      username: user?.githubUsername || null
    })

  } catch (error: any) {
    console.error('GitHub status error:', error)
    return NextResponse.json(
      { error: 'Failed to check GitHub status' },
      { status: 500 }
    )
  }
}

// DELETE: Disconnect GitHub account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubAccessToken: null,
        githubUsername: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'GitHub account disconnected'
    })

  } catch (error: any) {
    console.error('GitHub disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub' },
      { status: 500 }
    )
  }
}
