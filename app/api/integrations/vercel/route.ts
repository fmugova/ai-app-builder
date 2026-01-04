import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        vercelToken: true,
        vercelProjectName: true,
        vercelTeamId: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      token: user.vercelToken ? 'exists' : null, // Don't send actual token
      projectName: user.vercelProjectName,
      teamId: user.vercelTeamId,
    })

  } catch (error: any) {
    console.error('Vercel integration GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Vercel integration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { token, projectName, teamId } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Update user with Vercel settings
    await prisma.user.update({
      where: { id: user.id },
      data: {
        vercelToken: token,
        vercelProjectName: projectName || null,
        vercelTeamId: teamId || null,
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Vercel integration POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save Vercel integration' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove Vercel settings
    await prisma.user.update({
      where: { id: user.id },
      data: {
        vercelToken: null,
        vercelProjectName: null,
        vercelTeamId: null,
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Vercel integration DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Vercel integration' },
      { status: 500 }
    )
  }
}