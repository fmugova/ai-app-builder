export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

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

    // Build checkout session params
    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id || session.user.email,
        plan: plan || 'pro',
        priceId: priceId,
      },
    }

    // Apply promo code if provided
    if (promoCode) {
      sessionParams.discounts = [{ coupon: promoCode }]
      sessionParams.metadata.promoCode = promoCode
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
