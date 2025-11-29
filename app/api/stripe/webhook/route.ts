export const dynamic = 'force-dynamic'

// @ts-nocheck
import { NextResponse } from "next/server"
import { stripe, PLANS } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import Stripe from "stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as keyof typeof PLANS

        if (!userId || !plan) {
          throw new Error("Missing metadata")
        }

        const planConfig = PLANS[plan]

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            stripePriceId: session.line_items?.data[0]?.price?.id,
            plan: plan.toLowerCase(),
            status: "active",
            generationsLimit: planConfig.generationsLimit,
            generationsUsed: 0,
            stripeCurrentPeriodEnd: session.expires_at 
              ? new Date(session.expires_at * 1000)
              : null,
          },
          create: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            stripePriceId: session.line_items?.data[0]?.price?.id,
            plan: plan.toLowerCase(),
            status: "active",
            generationsLimit: planConfig.generationsLimit,
            generationsUsed: 0,
            stripeCurrentPeriodEnd: session.expires_at 
              ? new Date(session.expires_at * 1000)
              : null,
          },
        })

        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string | undefined

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              generationsUsed: 0,
            },
          })
        }

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription

        if (subscriptionId && typeof subscriptionId === 'string') {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "past_due",
            },
          })
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "canceled",
            plan: "free",
            generationsLimit: 3,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        })

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        })

        break
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
