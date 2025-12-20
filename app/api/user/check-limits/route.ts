export const dynamic = 'force-dynamic'

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        generationsUsed: true,
        generationsLimit: true,
        subscriptionTier: true,
        _count: {
          select: { projects: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const plan = user.subscriptionTier || 'free'
    const projectLimit = plan === 'free' ? 3 : plan === 'pro' ? 50 : 999
    const aiLimit = user.generationsLimit || 10

    return NextResponse.json({
      canGenerate: (user.generationsUsed || 0) < aiLimit,
      canCreateProject: user._count.projects < projectLimit,
      limits: {
        aiRequests: { used: user.generationsUsed || 0, limit: aiLimit },
        projects: { used: user._count.projects, limit: projectLimit },
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
