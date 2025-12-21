import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
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

    // Calculate next billing date if no subscription exists
    const currentPeriodEnd = user.currentPeriodEnd 
      || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const invoices = user.subscriptionTier !== 'free' ? [
      {
        id: '1',
        amount: getTierPrice(user.subscriptionTier),
        status: 'paid',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period: 'Dec 2024'
      }
    ] : []

    return NextResponse.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      currentPeriodStart: user.currentPeriodStart?.toISOString() || new Date().toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      projectsUsed: user.projectsThisMonth,
      projectsLimit: user.projectsLimit,
      generationsUsed: user.generationsUsed,
      generationsLimit: user.generationsLimit,
      invoices
    })
  } catch (error) {
    console.error('Billing error:', error)
    return NextResponse.json({ error: 'Failed to fetch billing info' }, { status: 500 })
  }
}

function getTierPrice(tier: string): number {
  switch(tier) {
    case 'enterprise': return 99
    case 'business': return 49
    case 'pro': return 19
    default: return 0
  }
}
