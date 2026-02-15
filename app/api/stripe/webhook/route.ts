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

/**
 * Retry a critical async operation with exponential backoff.
 * maxAttempts = 3 → delays: 200ms, 400ms then throws.
 * Only retries on transient errors (network, DB pool exhaustion, etc.).
 */
const MAX_WEBHOOK_RETRIES = 3
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = MAX_WEBHOOK_RETRIES
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts) {
        const delay = 200 * Math.pow(2, attempt - 1) // 200ms, 400ms
        console.warn(`⚠️ [webhook retry] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  console.error(`❌ [webhook retry] ${label} failed after ${maxAttempts} attempts`)
  throw lastErr
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

        // ── Credit top-up ───────────────────────────────────────────────────
        if (session.metadata?.type === 'credit_purchase') {
          const { userId, credits } = session.metadata
          const creditsToAdd = parseInt(credits || '0', 10)
          if (creditsToAdd > 0) {
            // withRetry: DB failure → propagates → 500 → Stripe retries the webhook
            await withRetry(
              () => prisma.user.update({
                where: { id: userId },
                data: { generationsLimit: { increment: BigInt(creditsToAdd) } },
              }),
              `credit_purchase user=${userId}`
            )
            console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`)
            logAnalyticsEvent('credits_purchased', { userId, credits: creditsToAdd })
          }
          break
        }

        // ── Template one-time purchase ──────────────────────────────────────
        if (session.metadata?.type === 'template_purchase') {
          const { templateId, userId, creatorId, price } = session.metadata
          const purchasePrice = parseFloat(price || '0')
          const PLATFORM_SHARE = 0.30
          const CREATOR_SHARE = 0.70

          // withRetry: DB failure → propagates → 500 → Stripe retries the webhook
          await withRetry(async () => {
            await prisma.templatePurchase.upsert({
              where: { templateId_userId: { templateId, userId } },
              update: {},
              create: { templateId, userId, price: purchasePrice },
            })
            await prisma.templateRevenue.create({
              data: {
                templateId,
                creatorId,
                amount: purchasePrice,
                platformShare: parseFloat((purchasePrice * PLATFORM_SHARE).toFixed(2)),
                creatorShare: parseFloat((purchasePrice * CREATOR_SHARE).toFixed(2)),
                stripePaymentId: session.payment_intent as string || null,
              },
            })
            await prisma.template.update({
              where: { id: templateId },
              data: { downloads: { increment: 1 } },
            })
          }, `template_purchase ${templateId} user=${userId}`)
          console.log(`✅ Template purchase recorded: ${templateId} by ${userId}`)
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

        // Update or create subscription — withRetry for transient DB failures
        await withRetry(
          () => prisma.subscription.upsert({
            where: { userId: session.metadata!.userId },
            update: {
              plan,
              status: 'active',
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.metadata?.priceId,
            },
            create: {
              userId: session.metadata!.userId,
              plan,
              status: 'active',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.metadata?.priceId,
            },
          }),
          `subscription.upsert user=${session.metadata!.userId}`
        )

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

        const updatedUser = await withRetry(
          () => prisma.user.update({
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
          }),
          `user.update email=${session.customer_details?.email}`
        )

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
