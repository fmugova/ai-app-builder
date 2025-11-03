import { NextResponse } from "next/server"
import { headers } from "next/headers" // Correct, synchronous import
import { stripe, PLANS } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import Stripe from "stripe"

export async function POST(req: Request) {
  // CRITICAL FIX: Stripe requires the raw body as a Buffer, not a parsed string.
  // Using req.text() will cause signature verification to fail.
  const body = await req.arrayBuffer()
  const buffer = Buffer.from(body)

  // This is the correct way to get the signature. It's synchronous.
  const signature = headers().get("stripe-signature")!

  let event: Stripe.Event

  try {
    // Pass the raw buffer to constructEvent, not the text body
    event = stripe.webhooks.constructEvent(
      buffer,
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

        // LOGIC FIX: Retrieve the subscription to get the correct end date.
        // session.expires_at is for the checkout session, not the subscription.
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

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
            // Use the correct date from the retrieved subscription
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
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
            // Use the correct date from the retrieved subscription
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
        })

        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId)

          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              stripeCurrentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ),
              generationsUsed: 0,
            },
          })
        }

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
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
            generationsLimit: 3, // Assuming 3 is your free tier limit
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
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
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
