import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
  typescript: true,
})

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    generationsLimit: 3,
    features: [
      '3 AI generations per month',
      'Save up to 5 projects',
      'Basic templates',
      'Community support'
    ]
  },
  PRO: {
    name: 'Pro',
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    generationsLimit: 100,
    features: [
      '100 AI generations per month',
      'Unlimited saved projects',
      'All premium templates',
      'AI chat refinements',
      'Priority support',
      'Export to multiple formats'
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    generationsLimit: -1,
    features: [
      'Unlimited AI generations',
      'Unlimited saved projects',
      'All templates & features',
      'Advanced AI models',
      'Custom branding',
      'API access',
      'Dedicated support',
      'Team collaboration'
    ]
  }
}

export type PlanType = keyof typeof PLANS

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>
) {
  const planConfig = PLANS[plan]
  
  if (!planConfig.priceId) {
    throw new Error('Invalid plan')
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    customer_email: email,
    client_reference_id: userId,
    metadata: {
      userId,
      plan,
    },
  })

  return session
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  })

  return session
}

export async function getSubscriptionStatus(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return subscription.status
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
  return subscription
}