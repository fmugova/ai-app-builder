// @/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover", // ← Matches stripe@19.1.0
  typescript: true,
});

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