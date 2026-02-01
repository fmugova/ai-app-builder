export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            Project: true
          }
        }
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const plan = user.subscriptionTier || 'free'
    const projectLimit = plan === 'free' ? 3 : plan === 'pro' ? 50 : 999
    const aiLimit = user.generationsLimit || 10

    return NextResponse.json({
      canGenerate: Number(user.generationsUsed ?? 0) < Number(aiLimit),
      canCreateProject: user._count.Project < projectLimit,
      limits: {
        aiRequests: { used: Number(user.generationsUsed ?? 0), limit: Number(aiLimit) },
        projects: { used: user._count.Project, limit: projectLimit },
      },
      plan,
    })
  } catch (error) {
    console.error('Check limits error:', error)
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    )
  }
}
