// @/lib/stripe.ts
import Stripe from "stripe";

const createStripeClient = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY

  if (!apiKey) {
    console.warn('Stripe API key not found. This is expected during build.')
    // Return a mock client during build
    return null as any
  }

  return new Stripe(apiKey, {
    apiVersion: "2025-09-30.clover", // ← Matches stripe@19.1.0
    typescript: true,
  })
}

export const stripe = createStripeClient();

export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    priceId: null,
    generationsLimit: 3,
    features: [
      "3 AI generations per month",
      "Save up to 5 projects",
      "Basic templates",
      "Community support",
    ],
  },
  PRO: {
    name: "Pro",
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    generationsLimit: 100,
    features: [
      "100 AI generations per month",
      "Unlimited saved projects",
      "All premium templates",
      "AI chat refinements",
      "Priority support",
      "Export to multiple formats",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    generationsLimit: -1,
    features: [
      "Unlimited AI generations",
      "Unlimited saved projects",
      "All templates & features",
      "Advanced AI models",
      "Custom branding",
      "API access",
      "Dedicated support",
      "Team collaboration",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;
export type PaidPlanType = Exclude<PlanType, "FREE">;

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: PaidPlanType
) {
  const planConfig = PLANS[plan];

  if (!planConfig.priceId) {
    throw new Error(`No price ID configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    customer_email: email,
    client_reference_id: userId,
    metadata: {
      userId,
      plan,
    },
  });

  return session;
}