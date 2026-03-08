export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5/hour per user (Upstash — survives serverless cold starts)
    const rl = await checkRateLimitByIdentifier(`checkout:${session.user.id || session.user.email}`, 'feedback')
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      )
    }

    const body = await request.json()
    const { priceId, plan, promoCode } = body

    // Allowlist: only accept price IDs that belong to this account
    const allowedPriceIds = [
      process.env.STRIPE_PRO_PRICE_ID,
      process.env.STRIPE_BUSINESS_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
    ].filter(Boolean)

    if (!priceId || !allowedPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price selection' }, { status: 400 })
    }

    // Build metadata object upfront so promoCode can be added safely
    const metadata: Record<string, string> = {
      userId: session.user.id || session.user.email || '',
      plan: plan || 'pro',
      priceId,
    }
    if (promoCode) metadata.promoCode = promoCode

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      customer_email: session.user.email,
      metadata,
    }

    // Apply promo code if provided
    if (promoCode) {
      sessionParams.discounts = [{ coupon: promoCode }]
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
