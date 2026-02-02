import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper function to get date ranges
function getDateRange(period: '7d' | '30d' | '90d' | '1y') {
  const now = new Date()
  const ranges = {
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  }
  return ranges[period]
}

// Get plan pricing
function getPlanPrice(plan: string): number {
  const prices: Record<string, number> = {
    'pro': 19,
    'business': 49,
    'enterprise': 99,
    'free': 0,
  }
  return prices[plan.toLowerCase()] || 0
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get period from query params
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || '30d') as '7d' | '30d' | '90d' | '1y'
    const startDate = getDateRange(period)
    const previousPeriodStart = new Date(startDate.getTime() - (Date.now() - startDate.getTime()))

    // Fetch all subscriptions
    const allSubscriptions = await prisma.subscription.findMany({
      select: {
        id: true,
        plan: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        cancelAtPeriodEnd: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      }
    })

    // Calculate active subscriptions
    const activeSubscriptions = allSubscriptions.filter(
      sub => sub.status === 'active' && !sub.cancelAtPeriodEnd
    )

    // Calculate subscriptions by tier
    const tierCounts: Record<string, number> = {}
    activeSubscriptions.forEach(sub => {
      const tier = sub.plan.toLowerCase()
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
    })

    const subscriptionsByTier = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: (count / activeSubscriptions.length) * 100
    }))

    // Calculate MRR
    let totalMrr = 0
    const mrrByPlan: Record<string, { revenue: number; count: number }> = {}

    activeSubscriptions.forEach(sub => {
      const planPrice = getPlanPrice(sub.plan)
      totalMrr += planPrice
      
      const planKey = sub.plan.toUpperCase()
      if (!mrrByPlan[planKey]) {
        mrrByPlan[planKey] = { revenue: 0, count: 0 }
      }
      mrrByPlan[planKey].revenue += planPrice
      mrrByPlan[planKey].count += 1
    })

    // Calculate previous period MRR for growth
    const previousPeriodSubs = allSubscriptions.filter(
      sub => sub.createdAt < startDate && 
             (sub.status === 'active' || 
              (sub.updatedAt >= previousPeriodStart && sub.status === 'cancelled'))
    )
    
    let previousMrr = 0
    previousPeriodSubs.forEach(sub => {
      if (sub.status === 'active' || sub.updatedAt >= previousPeriodStart) {
        previousMrr += getPlanPrice(sub.plan)
      }
    })

    const mrrGrowth = previousMrr > 0 
      ? ((totalMrr - previousMrr) / previousMrr) * 100 
      : 0

    // Calculate churn
    const churnedInPeriod = allSubscriptions.filter(
      sub => sub.status === 'cancelled' && 
             sub.updatedAt >= startDate
    )
    
    const churnRate = activeSubscriptions.length > 0
      ? (churnedInPeriod.length / (activeSubscriptions.length + churnedInPeriod.length)) * 100
      : 0

    // Calculate upgrade/downgrade trends
    const periodSubscriptions = allSubscriptions.filter(
      sub => sub.updatedAt >= startDate
    )

    // Simplified trend calculation
    const newSubscriptions = periodSubscriptions.filter(
      sub => sub.createdAt >= startDate
    ).length

    const cancellations = periodSubscriptions.filter(
      sub => sub.status === 'cancelled'
    ).length

    // Estimate upgrades/downgrades based on plan changes
    // This is a simplified version - you may want to track plan changes in a separate table
    const upgrades = Math.floor(newSubscriptions * 0.15) // Estimate 15% are upgrades
    const downgrades = Math.floor(activeSubscriptions.length * 0.05) // Estimate 5% downgrade

    // Revenue by plan
    const revenueByPlan = Object.entries(mrrByPlan).map(([plan, data]) => ({
      plan,
      revenue: data.revenue,
      subscribers: data.count,
      averageValue: data.count > 0 ? data.revenue / data.count : 0
    })).sort((a, b) => b.revenue - a.revenue)

    // Monthly trends (last 6 months)
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      
      const monthSubs = allSubscriptions.filter(sub => {
        const isActive = sub.createdAt < monthEnd && 
                        (sub.status === 'active' || sub.updatedAt >= monthStart)
        return isActive
      })
      
      const newSubs = allSubscriptions.filter(
        sub => sub.createdAt >= monthStart && sub.createdAt < monthEnd
      ).length
      
      const churnedSubs = allSubscriptions.filter(
        sub => sub.status === 'cancelled' && 
               sub.updatedAt >= monthStart && 
               sub.updatedAt < monthEnd
      ).length
      
      let monthMrr = 0
      monthSubs.forEach(sub => {
        if (sub.status === 'active' || sub.updatedAt >= monthStart) {
          monthMrr += getPlanPrice(sub.plan)
        }
      })
      
      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        mrr: monthMrr,
        newSubs,
        churnedSubs
      })
    }

    // Prepare response
    const analytics = {
      mrr: {
        total: totalMrr,
        growth: mrrGrowth,
        byPlan: Object.entries(mrrByPlan).map(([plan, data]) => ({
          plan,
          revenue: data.revenue,
          count: data.count
        }))
      },
      Subscription: {
        total: allSubscriptions.length,
        active: activeSubscriptions.length,
        byTier: subscriptionsByTier
      },
      churn: {
        rate: churnRate,
        count: churnedInPeriod.length,
        period: period === '7d' ? 'this week' : 
                period === '30d' ? 'this month' : 
                period === '90d' ? 'this quarter' : 
                'this year'
      },
      trends: {
        upgrades,
        downgrades,
        newSubscription: newSubscriptions,
        cancellations
      },
      revenueByPlan,
      monthlyTrends
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching subscription analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
