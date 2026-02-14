export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { sendEmail, getSubscriptionSuccessHTML } from '@/lib/email'
import { logWebhookEvent, updateWebhookEvent, isWebhookEventProcessed } from '@/lib/webhook-logger'

// Server-side analytics logging (GA tracking happens client-side)
const logAnalyticsEvent = (event: string, properties?: Record<string, any>) => {
  console.log(`📊 Analytics [${event}]:`, properties || {})
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  let webhookLogId: string = ''
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      
      // Log failed signature verification
      await logWebhookEvent(
        {
          provider: 'stripe',
          eventType: 'signature_verification_failed',
          data: { error: err.message },
        },
        { status: 'failed', error: err.message }
      )
      
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Check for duplicate event
    if (event.id && await isWebhookEventProcessed('stripe', event.id)) {
      console.log(`⏭️ Skipping duplicate webhook event: ${event.id}`)
      return NextResponse.json({ received: true, status: 'duplicate' })
    }

    // Log webhook event
    webhookLogId = await logWebhookEvent({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      data: event.data.object,
      metadata: {
        livemode: event.livemode,
        apiVersion: event.api_version,
      },
    })

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        if (!session.metadata?.userId) {
          console.error('No userId in session metadata')
          break
        }

        // Derive plan from actual Stripe subscription price, not metadata
        // to prevent plan escalation via metadata tampering
        let plan = 'pro'
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            const priceId = subscription.items.data[0]?.price.id
            const PRICE_PLAN_MAP: Record<string, string> = {
              [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
              [process.env.STRIPE_BUSINESS_PRICE_ID || '']: 'business',
              [process.env.STRIPE_ENTERPRISE_PRICE_ID || '']: 'enterprise',
            }
            plan = PRICE_PLAN_MAP[priceId] ?? session.metadata?.plan ?? 'pro'
          } catch (stripeErr) {
            console.error('Failed to retrieve subscription for plan verification:', stripeErr)
            plan = session.metadata?.plan ?? 'pro'
          }
        } else {
          plan = session.metadata?.plan ?? 'pro'
        }

        const planConfig = {
          pro: { generationsLimit: 100, projectsLimit: 50 },
          business: { generationsLimit: 500, projectsLimit: 200 },
          free: { generationsLimit: 3, projectsLimit: 3 },
        }[plan] || { generationsLimit: 100, projectsLimit: 50 }

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
        // Apply promo code if present
        if (session.metadata?.promoCode) {
          try {
            const promo = await prisma.promo_codes.findFirst({
              where: {
                code: session.metadata.promoCode.toUpperCase(),
                active: true,
              },
            })

            if (promo) {
              // Increment usage count
              await prisma.promo_codes.update({
                where: { id: promo.id },
                data: { timesUsed: { increment: 1 } },
              })
              console.log(`✅ Promo code applied: ${promo.code}`)
            }
          } catch (promoError) {
            console.error('Failed to apply promo code:', promoError)
          }
        }

        const updatedUser = await prisma.user.update({
          where: { email: session.customer_details?.email || undefined },
          data: {
            subscriptionTier: plan,
            subscriptionStatus: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            generationsLimit: planConfig.generationsLimit,
            projectsLimit: planConfig.projectsLimit,
            generationsUsed: 0,
            ...(session.metadata?.promoCode && { promoCodeUsed: session.metadata.promoCode }),
          },
        })

        // Send subscription success email
        if (updatedUser.email) {
          try {
            await sendEmail({
              to: updatedUser.email,
              subject: `🎉 Welcome to BuildFlow ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`,
              html: getSubscriptionSuccessHTML(updatedUser.name || 'there', plan),
            })
            console.log(`📧 Subscription email sent to: ${updatedUser.email}`)
          } catch (emailError) {
            console.error('Failed to send subscription email:', emailError)
          }
        }

        // Log checkout completed analytics event
        logAnalyticsEvent('checkout_completed', {
          tier: plan,
          value: session.amount_total ? session.amount_total / 100 : 0,
          currency: 'USD',
          userId: session.metadata.userId
        })

        console.log(`✅ Subscription created for user: ${session.metadata.userId}`)
        
        // Update webhook log with user ID
        if (webhookLogId && session.metadata.userId) {
          await prisma.webhookEvent.update({
            where: { id: webhookLogId },
            data: { userId: session.metadata.userId },
          }).catch(() => {})
        }
        
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

    // Mark webhook as processed
    if (webhookLogId) {
      await updateWebhookEvent(webhookLogId, 'processed')
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    
    // Mark webhook as failed
    if (webhookLogId) {
      await updateWebhookEvent(webhookLogId, 'failed', error.message)
    }
    
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
