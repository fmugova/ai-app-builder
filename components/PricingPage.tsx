"use client";
import { useState } from "react";
import { Check, Sparkles, Zap, Rocket, Crown } from "lucide-react";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  icon: React.ReactNode;
  color: string;
}

export default function PricingPage() {
  const pricingTiers: PricingTier[] = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out Buildflow",
      icon: <Sparkles className="w-6 h-6" />,
      color: "gray",
      features: [
        "3 code generations per month",
        "Basic templates",
        "Community support",
        "Export as ZIP",
        "Standard AI refinements",
      ],
      cta: "Get Started",
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      description: "For serious builders and developers",
      icon: <Zap className="w-6 h-6" />,
      color: "blue",
      highlighted: true,
      features: [
        "Unlimited code generations",
        "All premium templates",
        "Priority AI processing",
        "Direct GitHub integration",
        "Advanced customization",
        "Export to any platform",
        "Priority support",
        "Remove Buildflow branding",
      ],
      cta: "Start Pro Trial",
    },
    {
      name: "Business",
      price: "$79",
      period: "per month",
      description: "For teams and agencies",
      icon: <Crown className="w-6 h-6" />,
      color: "purple",
      features: [
        "Everything in Pro",
        "5 team member seats",
        "Team collaboration tools",
        "Project sharing",
        "Usage analytics dashboard",
        "Custom templates",
        "API access",
        "Dedicated account manager",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
    },
  ];

  const handleSelectPlan = (tier: string) => {
    // Replace with your actual checkout/contact logic
    if (tier === "Business") {
      window.location.href = "mailto:sales@buildflow.ai?subject=Business Plan Inquiry";
    } else if (tier === "Pro") {
      // Redirect to checkout or payment page
      console.log("Redirect to Pro checkout");
    } else {
      // Free plan - just sign up
      console.log("Redirect to sign up");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6">
          <Rocket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            Simple, transparent pricing
          </span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Start free and scale as you grow. All plans include our core features.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all hover:scale-105 ${
                tier.highlighted
                  ? "ring-2 ring-blue-600 dark:ring-blue-500"
                  : "border border-gray-200 dark:border-gray-700"
              }`}
            >
              {/* Popular Badge */}
              {tier.highlighted && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Icon Header */}
              <div className={`p-8 ${
                tier.highlighted
                  ? "bg-gradient-to-r from-blue-600 to-purple-600"
                  : "bg-gray-50 dark:bg-gray-900"
              }`}>
                <div className={`inline-flex p-3 rounded-xl ${
                  tier.highlighted
                    ? "bg-white/20"
                    : "bg-white dark:bg-gray-800"
                }`}>
                  <div className={tier.highlighted ? "text-white" : "text-gray-600 dark:text-gray-400"}>
                    {tier.icon}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    {tier.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    / {tier.period}
                  </span>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(tier.name)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                      : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                  }`}
                >
                  {tier.cta}
                </button>

                {/* Features List */}
                <ul className="mt-8 space-y-4">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-6">
          <FAQItem
            question="Can I change plans anytime?"
            answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the charges."
          />
          <FAQItem
            question="What happens when I hit my generation limit?"
            answer="On the Free plan, you'll need to wait until the next month or upgrade to Pro. Pro users have unlimited generations."
          />
          <FAQItem
            question="Do you offer refunds?"
            answer="Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked."
          />
          <FAQItem
            question="Can I use the generated code commercially?"
            answer="Absolutely! All code generated by Buildflow is yours to use however you'd like, including commercial projects."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards, PayPal, and wire transfers for Business plans."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Ship Your Ideas Faster?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of developers and businesses building with Buildflow
          </p>
          <button
            onClick={() => handleSelectPlan("Pro")}
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            Start Free Trial
            <Rocket className="w-5 h-5 ml-2" />
          </button>
          <p className="text-white/80 text-sm mt-4">
            No credit card required • 7-day free trial
          </p>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="font-semibold text-gray-900 dark:text-white">
          {question}
        </span>
        <span className="text-2xl text-gray-400">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
          {answer}
        </div>
      )}
    </div>
  );
}