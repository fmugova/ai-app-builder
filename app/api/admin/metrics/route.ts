/**
 * Business Metrics API
 *
 * GET /api/admin/metrics?period=30d
 *
 * Returns:
 *  - revenue: MRR, ARR, total, growth %
 *  - users: total, DAU, WAU, MAU, growth
 *  - funnel: signup → first_generation → upgrade conversion rates
 *  - templates: marketplace revenue, top sellers
 *  - churn: lost subscribers this period
 *
 * Admin-only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' })
  : null

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== 'admin') return null
  return session
}

function periodToDays(period: string): number {
  switch (period) {
    case '7d':  return 7
    case '30d': return 30
    case '90d': return 90
    case '1y':  return 365
    default:    return 30
  }
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '30d'
  const days = periodToDays(period)

  const now = new Date()
  const periodStart = new Date(now.getTime() - days * 86_400_000)
  const prevPeriodStart = new Date(periodStart.getTime() - days * 86_400_000)

  // ── 1. User metrics ──────────────────────────────────────────────────────
  const [
    totalUsers,
    newUsersThisPeriod,
    newUsersPrevPeriod,
    dauRaw,
    wauRaw,
    mauRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.user.count({ where: { createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    // DAU: users who created/updated a project in last 1 day
    prisma.user.count({ where: { updatedAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    // WAU: last 7 days
    prisma.user.count({ where: { updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    // MAU: last 30 days
    prisma.user.count({ where: { updatedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } }),
  ])

  const userGrowthPct = newUsersPrevPeriod > 0
    ? Math.round(((newUsersThisPeriod - newUsersPrevPeriod) / newUsersPrevPeriod) * 100)
    : newUsersThisPeriod > 0 ? 100 : 0

  // ── 2. Subscription / revenue metrics ───────────────────────────────────
  const activeSubs = await (prisma.subscription as unknown as {
    findMany: (args: unknown) => Promise<{ plan: string; stripeSubscriptionId: string | null }[]>
  }).findMany({
    where: { status: 'active' },
    select: { plan: true, stripeSubscriptionId: true },
  })

  // Plan → monthly price map (USD)
  const PLAN_PRICE: Record<string, number> = {
    pro: 19,
    starter: 9,
    enterprise: 99,
    free: 0,
  }

  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICE[s.plan] ?? 0), 0)
  const arr = mrr * 12

  // New paying subs this period
  const newPayingSubs = await (prisma.subscription as unknown as {
    count: (args: unknown) => Promise<number>
  }).count({
    where: {
      status: 'active',
      plan: { not: 'free' },
      createdAt: { gte: periodStart },
    },
  })

  // Churned (canceled this period)
  const churnedSubs = await (prisma.subscription as unknown as {
    count: (args: unknown) => Promise<number>
  }).count({
    where: {
      status: 'canceled',
      updatedAt: { gte: periodStart },
    },
  })

  // Subscription distribution
  const subsByPlan = await (prisma.subscription as unknown as {
    groupBy: (args: unknown) => Promise<{ plan: string; _count: { plan: number } }[]>
  }).groupBy({
    by: ['plan'],
    where: { status: 'active' },
    _count: { plan: true },
  })

  const totalActiveSubs = subsByPlan.reduce((s, r) => s + r._count.plan, 0)
  const planDistribution = subsByPlan.map((r) => ({
    plan: r.plan,
    count: r._count.plan,
    percentage: totalActiveSubs > 0 ? Math.round((r._count.plan / totalActiveSubs) * 100) : 0,
    revenue: (PLAN_PRICE[r.plan] ?? 0) * r._count.plan,
  }))

  // Churn rate = churned / (churned + active at start of period)
  const activeAtPeriodStart = activeSubs.length + churnedSubs
  const churnRate = activeAtPeriodStart > 0
    ? Math.round((churnedSubs / activeAtPeriodStart) * 100 * 10) / 10
    : 0

  // ── 3. Revenue from Stripe (actual charges) ──────────────────────────────
  let stripeRevenue = { total: 0, thisPeriod: 0, prevPeriod: 0 }
  if (stripe) {
    try {
      const [currentCharges, prevCharges] = await Promise.all([
        stripe.charges.list({
          created: { gte: Math.floor(periodStart.getTime() / 1000) },
          limit: 100,
        }),
        stripe.charges.list({
          created: {
            gte: Math.floor(prevPeriodStart.getTime() / 1000),
            lt: Math.floor(periodStart.getTime() / 1000),
          },
          limit: 100,
        }),
      ])

      stripeRevenue.thisPeriod = currentCharges.data
        .filter((c) => c.paid && !c.refunded)
        .reduce((s, c) => s + c.amount, 0) / 100

      stripeRevenue.prevPeriod = prevCharges.data
        .filter((c) => c.paid && !c.refunded)
        .reduce((s, c) => s + c.amount, 0) / 100

      stripeRevenue.total = stripeRevenue.thisPeriod // for display
    } catch {
      // Stripe not configured or API error — use subscription-based estimate
      stripeRevenue.total = mrr
    }
  } else {
    stripeRevenue.total = mrr
  }

  const revenueGrowthPct = stripeRevenue.prevPeriod > 0
    ? Math.round(((stripeRevenue.thisPeriod - stripeRevenue.prevPeriod) / stripeRevenue.prevPeriod) * 100)
    : stripeRevenue.thisPeriod > 0 ? 100 : 0

  // ── 4. Conversion funnel ─────────────────────────────────────────────────
  const [signups, projectCreators, paidUsers] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.user.count({
      where: {
        createdAt: { gte: periodStart },
        projects: { some: {} },
      },
    }),
    (prisma.subscription as unknown as { count: (args: unknown) => Promise<number> }).count({
      where: {
        plan: { not: 'free' },
        status: 'active',
        createdAt: { gte: periodStart },
      },
    }),
  ])

  const funnel = [
    { step: 'Signed Up', count: signups, rate: 100 },
    {
      step: 'Generated First Site',
      count: projectCreators,
      rate: signups > 0 ? Math.round((projectCreators / signups) * 100) : 0,
    },
    {
      step: 'Upgraded to Pro',
      count: paidUsers,
      rate: signups > 0 ? Math.round((paidUsers / signups) * 100) : 0,
    },
  ]

  // ── 5. Projects & generation stats ───────────────────────────────────────
  const [totalProjects, newProjects, totalPublished] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.project.count({ where: { isPublished: true } }),
  ])

  // ── 6. Template marketplace ───────────────────────────────────────────────
  let templateMetrics = { totalRevenue: 0, totalPurchases: 0, topTemplates: [] as unknown[] }
  try {
    const [tRevenue, tPurchases] = await Promise.all([
      (prisma.templateRevenue as unknown as { aggregate: (args: unknown) => Promise<{ _sum: { amount: number | null } }> }).aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: periodStart } },
      }),
      (prisma.templatePurchase as unknown as { count: (args: unknown) => Promise<number> }).count({
        where: { purchasedAt: { gte: periodStart } },
      }),
    ])
    templateMetrics.totalRevenue = tRevenue._sum.amount ?? 0
    templateMetrics.totalPurchases = tPurchases
  } catch {
    // Template tables may not exist yet
  }

  // ── 7. Monthly revenue trend (last 6 months) ─────────────────────────────
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const [newSubs, churned, newSignups] = await Promise.all([
      (prisma.subscription as unknown as { count: (args: unknown) => Promise<number> }).count({
        where: { status: 'active', plan: { not: 'free' }, createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      (prisma.subscription as unknown as { count: (args: unknown) => Promise<number> }).count({
        where: { status: 'canceled', updatedAt: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.user.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    ])
    monthlyTrend.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      newSubscribers: newSubs,
      churned,
      signups: newSignups,
      estimatedMrr: newSubs * (PLAN_PRICE.pro ?? 19),
    })
  }

  return NextResponse.json({
    period,
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      newThisPeriod: newUsersThisPeriod,
      growthPct: userGrowthPct,
      dau: dauRaw,
      wau: wauRaw,
      mau: mauRaw,
    },
    revenue: {
      mrr,
      arr,
      thisPeriod: stripeRevenue.thisPeriod,
      growthPct: revenueGrowthPct,
    },
    subscriptions: {
      active: activeSubs.length,
      newThisPeriod: newPayingSubs,
      churned: churnedSubs,
      churnRate,
      planDistribution,
    },
    funnel,
    projects: {
      total: totalProjects,
      newThisPeriod: newProjects,
      published: totalPublished,
    },
    templates: templateMetrics,
    monthlyTrend,
  })
}
