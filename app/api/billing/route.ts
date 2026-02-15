// app/api/billing/route.ts
// FIXED: Convert BigInt to Number for JSON serialization

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
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        projectsThisMonth: true,
        projectsLimit: true,
        generationsUsed: true,
        generationsLimit: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    })

    const currentPeriodStart = subscription?.currentPeriodStart || new Date()
    const currentPeriodEnd = subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // ✅ Convert BigInt to Number for JSON serialization
    return NextResponse.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      usage: {
        projects: {
          used: Number(user.projectsThisMonth),
          limit: Number(user.projectsLimit),
          percentage: Number(user.projectsLimit) > 0
            ? Math.min(100, Math.round((Number(user.projectsThisMonth) / Number(user.projectsLimit)) * 100))
            : 0,
        },
        generations: {
          used: Number(user.generationsUsed),
          limit: Number(user.generationsLimit),
          percentage: Number(user.generationsLimit) > 0
            ? Math.min(100, Math.round((Number(user.generationsUsed) / Number(user.generationsLimit)) * 100))
            : 0,
        },
      },
    })

  } catch (error) {
    console.error('Billing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    )
  }
}
