export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        if (!session.metadata?.userId) {
          console.error('No userId in session metadata')
          break
        }

        // Determine plan from amount
        const plan = 
          session.amount_total === 1900 ? 'pro' : 
          session.amount_total === 4900 ? 'business' : 
          'free'

        const planConfig = {
          pro: { generationsLimit: 100, projectsLimit: 50 },
          business: { generationsLimit: 500, projectsLimit: 200 },
          free: { generationsLimit: 3, projectsLimit: 3 },
        }[plan]

        // Update or create subscription
        await prisma.subscription.upsert({
          where: { userId: session.metadata.userId },
          update: {
            plan: plan,
            status: 'active',
            stripeSubscriptionId: session.subscription as string,
            stripePriceId: session.metadata?.priceId,
          },
          create: {
            userId: session.metadata.userId,
            plan: plan,
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            stripePriceId: session.metadata?.priceId,
          },
        })

        // Update user
        await prisma.user.update({
          where: { id: session.metadata.userId },
          data: {
            subscriptionTier: plan,
            subscriptionStatus: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            generationsLimit: planConfig.generationsLimit,
            projectsLimit: planConfig.projectsLimit,
            generationsUsed: 0,
          },
        })

        console.log(`✅ Subscription created for user: ${session.metadata.userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object

        const status = subscription.status === 'active' ? 'active' : 'canceled'

        // Update subscription in database
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: status,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          },
        })

        // Update user
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: status,
          },
        })

        console.log(`✅ Subscription updated: ${subscription.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        // Update subscription to canceled
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'canceled',
            cancelAtPeriodEnd: false,
          },
        })

        // Update user to free tier
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            generationsLimit: 3,
            projectsLimit: 3,
          },
        })

        console.log(`✅ Subscription canceled: ${subscription.id}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any

        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: {
              status: 'active',
            },
          })

          console.log(`✅ Payment succeeded for subscription: ${invoice.subscription}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any

        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: {
              status: 'past_due',
            },
          })

          await prisma.user.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: {
              subscriptionStatus: 'past_due',
            },
          })

          console.log(`❌ Payment failed for subscription: ${invoice.subscription}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}