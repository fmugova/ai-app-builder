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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        generationsUsed: true,
        generationsLimit: true,
        subscriptionTier: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      usage: {
        used: user.generationsUsed || 0,
        limit: user.generationsLimit || 10,
        plan: user.subscriptionTier || 'free',
        remaining: (user.generationsLimit || 10) - (user.generationsUsed || 0),
      },
    })
  } catch (error) {
    console.error('Usage error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
