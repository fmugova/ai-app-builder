// app/api/billing/route.ts

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Base generations included in each plan (used to compute extra credits purchased)
const PLAN_BASE_GENERATIONS: Record<string, number> = {
  free:       10,
  pro:       100,
  business:  500,
  enterprise: -1, // unlimited
}

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
        stripeCustomerId: true,
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
    const currentPeriodEnd   = subscription?.currentPeriodEnd   || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Days remaining in billing period
    const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - Date.now()) / 86_400_000))

    // Convert BigInt usage fields
    const projectsUsed      = Number(user.projectsThisMonth)
    const projectsLimit     = Number(user.projectsLimit)
    const generationsUsed   = Number(user.generationsUsed)
    const generationsLimit  = Number(user.generationsLimit)

    // Extra credits = total limit minus the plan base (0 if equal or unknown)
    const tier = user.subscriptionTier || 'free'
    const basePlanGenerations = PLAN_BASE_GENERATIONS[tier] ?? 0
    const extraCreditsPurchased = generationsLimit > basePlanGenerations && basePlanGenerations !== -1
      ? generationsLimit - basePlanGenerations
      : 0

    // Fetch recent invoices from Stripe (best-effort)
    let invoices: Array<{ id: string; amount: number; status: string; date: string; period: string; url: string | null }> = []
    if (user.stripeCustomerId) {
      try {
        const stripeInvoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 12,
        })
        invoices = stripeInvoices.data.map((inv) => ({
          id:     inv.id,
          amount: inv.amount_paid / 100,
          status: inv.status ?? 'unknown',
          date:   new Date(inv.created * 1000).toISOString(),
          period: inv.lines.data[0]?.description || (
            inv.lines.data[0]?.period
              ? `${new Date(inv.lines.data[0].period.start * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} subscription`
              : 'Subscription'
          ),
          url: inv.hosted_invoice_url ?? null,
        }))
      } catch (err) {
        console.error('Failed to fetch Stripe invoices:', err)
      }
    }

    return NextResponse.json({
      // Flat fields (used by BillingClient)
      tier,
      status:              user.subscriptionStatus,
      currentPeriodStart:  currentPeriodStart.toISOString(),
      currentPeriodEnd:    currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd:   subscription?.cancelAtPeriodEnd ?? false,
      daysRemaining,
      projectsUsed,
      projectsLimit,
      generationsUsed,
      generationsLimit,
      extraCreditsPurchased,
      invoices,
      // Nested usage object (for UsageClient / future consumers)
      usage: {
        projects: {
          used:       projectsUsed,
          limit:      projectsLimit,
          percentage: projectsLimit > 0
            ? Math.min(100, Math.round((projectsUsed / projectsLimit) * 100))
            : 0,
        },
        generations: {
          used:       generationsUsed,
          limit:      generationsLimit,
          percentage: generationsLimit > 0
            ? Math.min(100, Math.round((generationsUsed / generationsLimit) * 100))
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
