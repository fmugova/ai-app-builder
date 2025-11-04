import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/* -------------------------------------------------------------
   POST – Stripe webhook handler
   ------------------------------------------------------------- */
export async function POST(req: Request) {
  /* 1. Raw body (buffer) – required for signature verification */
  const body = await req.arrayBuffer();
  const buffer = Buffer.from(body);

  /* 2. Stripe signature */
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  /* 3. Verify the event */
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buffer,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  /* 4. Handle relevant events */
  try {
    switch (event.type) {
      /* ------------------- checkout.session.completed ------------------- */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.client_reference_id;
        const plan = session.metadata?.plan as keyof typeof PLANS | undefined;

        if (!userId || !plan) {
          throw new Error("Missing client_reference_id or plan in metadata");
        }

        const planConfig = PLANS[plan];
        if (!planConfig) throw new Error(`Invalid plan: ${plan}`);

        // Retrieve the **subscription** (not the checkout session) for the correct period end
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as Stripe.Subscription;

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            plan: plan.toLowerCase(),
            status: "active",
            generationsLimit: planConfig.generationsLimit,
            generationsUsed: 0,
            stripeCurrentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
          },
          create: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            plan: plan.toLowerCase(),
            status: "active",
            generationsLimit: planConfig.generationsLimit,
            generationsUsed: 0,
            stripeCurrentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
          },
        });
        break;
      }

      /* ------------------- invoice.payment_succeeded ------------------- */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          ) as Stripe.Subscription;

          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              stripeCurrentPeriodEnd: new Date(
                (subscription as any).current_period_end * 1000
              ),
              generationsUsed: 0,
            },
          });
        }
        break;
      }

      /* ------------------- invoice.payment_failed ------------------- */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | null;

        if (subscriptionId) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "past_due",
            },
          });
        }
        break;
      }

      /* ------------------- customer.subscription.deleted ------------------- */
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "canceled",
            plan: "free",
            generationsLimit: PLANS.FREE.generationsLimit,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }

      /* ------------------- customer.subscription.updated ------------------- */
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
          },
        });
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}