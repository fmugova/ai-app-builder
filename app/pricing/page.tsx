"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out BuildFlow",
    features: [
      "3 generations per month",
      "Basic project types",
      "Export code",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
    priceId: null,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious builders and teams",
    features: [
      "Unlimited generations",
      "All project types",
      "Priority support",
      "Advanced features",
      "Version history",
      "Project sharing",
      "Analytics dashboard",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    name: "Business",
    price: "Custom",
    period: "contact sales",
    description: "For enterprise teams",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Team management",
      "White-label options",
    ],
    cta: "Contact Sales",
    highlighted: false,
    priceId: null,
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePlanClick = async (plan: typeof plans[0]) => {
    if (!session) {
      router.push("/auth/signin?callbackUrl=/pricing");
      return;
    }

    if (plan.name === "Free") {
      router.push("/dashboard");
      return;
    }

    if (plan.name === "Business") {
      window.location.href = "mailto:sales@buildflow.com?subject=Enterprise Plan Inquiry";
      return;
    }

    if (plan.priceId) {
      try {
        setLoading(plan.name);
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: plan.priceId }),
        });

        if (response.ok) {
          const { url } = await response.json();
          window.location.href = url;
        } else {
          alert("Failed to start checkout. Please try again.");
        }
      } catch (error) {
        console.error("Checkout error:", error);
        alert("An error occurred. Please try again.");
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start building amazing apps with BuildFlow. Upgrade anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-gradient-to-br from-purple-500 to-blue-600 text-white ring-4 ring-purple-500 ring-offset-4 dark:ring-offset-gray-900 scale-105"
                  : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline">
                  <span className={`text-5xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"}`}>
                    {plan.price}
                  </span>
                  <span className={`ml-2 ${plan.highlighted ? "text-white/80" : "text-gray-600 dark:text-gray-400"}`}>
                    /{plan.period}
                  </span>
                </div>
                <p className={`mt-4 ${plan.highlighted ? "text-white/90" : "text-gray-600 dark:text-gray-400"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-white" : "text-purple-600 dark:text-purple-400"}`} />
                    <span className={plan.highlighted ? "text-white" : "text-gray-700 dark:text-gray-300"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanClick(plan)}
                disabled={loading === plan.name}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.highlighted
                    ? "bg-white text-purple-600 hover:bg-gray-100"
                    : "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                }`}
              >
                {loading === plan.name ? "Processing..." : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to build something amazing?
            </h2>
            <p className="text-white/90 text-lg mb-8">
              Join thousands of developers building with BuildFlow
            </p>
            <button
              onClick={() => handlePlanClick(plans[1])}
              disabled={loading === "Pro"}
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 disabled:opacity-50"
            >
              {loading === "Pro" ? "Processing..." : "Start Free Trial"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}