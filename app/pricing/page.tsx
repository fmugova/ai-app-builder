"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect for trying out the platform",
    features: [
      "3 AI generations per month",
      "Basic templates",
      "Community support",
      "Export code"
    ],
    cta: "Get Started",
    highlighted: false
  },
  {
    name: "Pro",
    price: "29",
    description: "Best for professional developers",
    features: [
      "Unlimited AI generations",
      "All premium templates",
      "Priority support",
      "Advanced customization",
      "Export to GitHub",
      "Team collaboration"
    ],
    cta: "Start Free Trial",
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "99",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom integrations",
      "SSO & advanced security",
      "Priority feature requests",
      "SLA guarantee"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
];

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const handleSubscribe = (planName: string) => {
    if (planName === "Free") {
      router.push("/dashboard");
    } else {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start building amazing apps with AI assistance
          </p>

          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-green-600 font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                plan.highlighted ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">
                    ${billingCycle === "annual" && plan.price !== "0" 
                      ? Math.round(parseFloat(plan.price) * 0.8) 
                      : plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {plan.price === "0" ? "forever" : `/${billingCycle === "monthly" ? "mo" : "yr"}`}
                  </span>
                </div>

                <button
                  onClick={() => handleSubscribe(plan.name)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </button>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! Pro plan includes a 14-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}