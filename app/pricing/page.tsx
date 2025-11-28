'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, ArrowLeft, Loader2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for BuildFlow. Start free with 3 generations per month.',
  alternates: {
    canonical: 'https://buildflow.app/pricing',
  },
  openGraph: {
    url: 'https://buildflow.app/pricing',
    title: 'BuildFlow Pricing - Start Free',
    description: 'Simple, transparent pricing. Start free with 3 generations per month.',
  },
}

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Perfect for trying out the platform',
      features: [
        '3 AI generations per month',
        'Basic templates',
        'Community support',
        'Export code',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 29,
      annualPrice: 23, // $276/year = $23/month (save 20%)
      description: 'Best for professional developers',
      features: [
        'Unlimited AI generations',
        'All premium templates',
        'Priority support',
        'Advanced customization',
        'Export to GitHub',
        'Team collaboration',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 99,
      annualPrice: 79, // $948/year = $79/month (save 20%)
      description: 'For teams and organizations',
      features: [
        'Everything in Pro',
        'Dedicated support',
        'Custom integrations',
        'SSO & advanced security',
        'Priority feature requests',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ]

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code')
      return
    }

    setValidatingPromo(true)
    setPromoError('')

    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.toUpperCase(),
          plan: 'pro',
        }),
      })

      const data = await response.json()

      if (data.valid) {
        setPromoApplied(true)
        setPromoDiscount(data.discountValue)
        setPromoError('')
      } else {
        setPromoError(data.error || 'Invalid promo code')
        setPromoApplied(false)
        setPromoDiscount(0)
      }
    } catch (error) {
      setPromoError('Failed to validate promo code')
      setPromoApplied(false)
      setPromoDiscount(0)
    } finally {
      setValidatingPromo(false)
    }
  }

  const calculatePrice = (plan: typeof plans[0]) => {
    const basePrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
    if (basePrice === 0) return 0
    if (promoApplied && plan.id === 'pro') {
      return basePrice - (basePrice * promoDiscount / 100)
    }
    return basePrice
  } //

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      router.push(session ? '/dashboard' : '/auth/signup')
      return
    }

    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@buildflow.app?subject=Enterprise Plan Inquiry'
      return
    }

    // ✅ Include promo code in checkout
    const params = new URLSearchParams({
      plan: planId,
      ...(promoApplied && promoCode ? { promo: promoCode } : {})
    })
    
    router.push(`/checkout?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-8 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Start building amazing apps with AI assistance
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                billingCycle === 'annual'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>

          {/* Promo Code Input */}
          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase())
                  setPromoError('')
                  setPromoApplied(false)
                }}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none uppercase font-mono"
              />
              <button
                onClick={applyPromoCode}
                disabled={validatingPromo || !promoCode.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {validatingPromo ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
            
            {promoApplied && (
              <p className="text-green-600 text-sm mt-2 font-medium flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                🎉 {promoDiscount}% discount applied!
              </p>
            )}
            
            {promoError && (
              <p className="text-red-600 text-sm mt-2">
                {promoError}
              </p>
            )}
            
            {!promoApplied && !promoError && (
              <p className="text-gray-500 text-sm mt-2">
                Try: <span className="font-mono font-bold">LAUNCH2024</span> for 50% off
              </p>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const finalPrice = calculatePrice(plan)
            const basePrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const savings = basePrice - finalPrice

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-xl p-8 relative transition-all hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                  <div className="flex items-baseline justify-center gap-2">
                    {promoApplied && plan.id === 'pro' && basePrice > 0 && (
                      <span className="text-2xl text-gray-400 line-through">
                        ${basePrice}
                      </span>
                    )}
                    <span className="text-5xl font-bold text-gray-900">
                      ${finalPrice}
                    </span>
                    <span className="text-gray-600">
                      /{billingCycle === 'monthly' ? 'mo' : 'mo'}
                    </span>
                  </div>

                  {billingCycle === 'annual' && basePrice > 0 && (
                    <p className="text-green-600 text-sm font-medium mt-1">
                      ${basePrice * 12}/year
                    </p>
                  )}

                  {promoApplied && savings > 0 && plan.id === 'pro' && (
                    <div className="mt-2">
                      <p className="text-green-600 text-sm font-medium">
                        Save ${savings.toFixed(2)}/month
                      </p>
                      <p className="text-xs text-gray-500">
                        for first 3 months
                      </p>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  className={`block w-full py-3 rounded-lg font-semibold text-center transition ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Building?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers building faster with AI
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  )
}