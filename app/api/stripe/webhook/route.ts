import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

/* -------------------------------------------------------------
   POST – Stripe webhook handler
   ------------------------------------------------------------- */
export async function POST(req: Request) {
  /* 1. Raw body (buffer) – required for signature verification */
  const body = await req.arrayBuffer();
  const buffer = Buffer.from(body);

  /* 2. Stripe signature (synchronous) */
  const signature = headers().get("stripe-signature");
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
        );

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            plan,
            status: "active",
            generationsLimit: planConfig.generationsLimit,
            generationsUsed: 0,
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            plan,
            status: "active",
            generationsLimit: planConfig.generationsLimit,
            generationsUsed: 0,
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
        });
        break;
      }

      /* -------------------------- invoice.paid -------------------------- */
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );

          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "active",
              stripeCurrentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ),
              generationsUsed: 0,
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
            plan: "FREE",
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
              subscription.current_period_end * 1000
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