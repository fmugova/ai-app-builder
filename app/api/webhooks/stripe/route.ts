export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  console.log('Stripe webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get customer email
        const customerEmail = session.customer_email || session.customer_details?.email
        
        if (!customerEmail) {
          console.error('No customer email found')
          break
        }

        // Update user subscription
        await prisma.user.update({
          where: { email: customerEmail },
          data: {
            stripeCustomerId: session.customer as string,
            subscriptionStatus: 'active',
            subscriptionTier: session.metadata?.tier || 'pro',
            projectsLimit: parseInt(session.metadata?.projectsLimit || '50'),
            generationsLimit: parseInt(session.metadata?.generationsLimit || '500'),
            updatedAt: new Date()
          }
        })

        console.log(`Subscription activated for ${customerEmail}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get customer
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const customerEmail = 'email' in customer ? customer.email : null
        
        if (!customerEmail) break

        // Update subscription status
        await prisma.user.update({
          where: { email: customerEmail },
          data: {
            subscriptionStatus: subscription.status,
            updatedAt: new Date()
          }
        })

        console.log(`Subscription updated for ${customerEmail}: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get customer
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const customerEmail = 'email' in customer ? customer.email : null
        
        if (!customerEmail) break

        // Downgrade to free tier
        await prisma.user.update({
          where: { email: customerEmail },
          data: {
            subscriptionStatus: 'cancelled',
            subscriptionTier: 'free',
            projectsLimit: 3,
            generationsLimit: 10,
            updatedAt: new Date()
          }
        })

        console.log(`Subscription cancelled for ${customerEmail}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice ${invoice.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Get customer
        const customer = await stripe.customers.retrieve(invoice.customer as string)
        const customerEmail = 'email' in customer ? customer.email : null
        
        if (!customerEmail) break

        // Mark subscription as past_due
        await prisma.user.update({
          where: { email: customerEmail },
          data: {
            subscriptionStatus: 'past_due',
            updatedAt: new Date()
          }
        })

        console.log(`Payment failed for ${customerEmail}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}