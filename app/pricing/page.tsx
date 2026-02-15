'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, ArrowLeft, Loader2, Zap } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { analytics } from '@/lib/analytics'

const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter Pack', credits: 10, price: 5, perCredit: '$0.50', badge: null },
  { id: 'growth',  name: 'Growth Pack',  credits: 50, price: 20, perCredit: '$0.40', badge: 'Best Value' },
  { id: 'power',   name: 'Power Pack',   credits: 120, price: 40, perCredit: '$0.33', badge: null },
  { id: 'agency',  name: 'Agency Pack',  credits: 300, price: 80, perCredit: '$0.27', badge: 'Lowest Cost/Credit' },
]

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      '3 Projects',
      'Basic AI Generation',
      'Community Support',
      'Basic Templates',
      'Export to HTML',
    ],
    limitations: [
      'Limited AI requests',
      'No priority support',
      'BuildFlow branding',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    originalPrice: 29,
    description: 'Best for professionals',
    features: [
      'Unlimited Projects',
      'Advanced AI Generation',
      'Priority Support',
      'All Premium Templates',
      'Export to HTML/ZIP',
      'GitHub Integration',
      'Remove Branding',
      'Custom Domains',
    ],
    limitations: [],
    cta: 'Upgrade to Pro',
    popular: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    id: 'business',
    name: 'Business',
    price: 49,
    description: 'For teams and agencies',
    features: [
      'Everything in Pro',
      'Team Collaboration',
      'API Access',
      'White-label Options',
      'Dedicated Support',
      'Custom Integrations',
      'Analytics Dashboard',
      'SLA Guarantee',
    ],
    limitations: [],
    cta: 'Contact Sales',
    popular: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState<string | null>(null)
  const [buyingCredits, setBuyingCredits] = useState<string | null>(null)

  const handleBuyCredits = async (packageId: string) => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }
    setBuyingCredits(packageId)
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to start checkout')
      }
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setBuyingCredits(null)
    }
  }
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string
    discountValue: number
    discountType: string
  } | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)

  // Track pricing page view on mount
  useEffect(() => {
    analytics.pricingViewed()
  }, [])

  // Apply promo code
  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code')
      return
    }

    setValidatingPromo(true)
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      })

      const data = await response.json()

      if (data.valid) {
        setAppliedPromo({
          code: data.code,
          discountValue: data.discountValue,
          discountType: data.discountType,
        })
        toast.success(`🎉 ${data.discountValue}% discount applied!`, {
          duration: 2000,
          id: 'discount-applied',
        })
        setTimeout(() => {
          toast.dismiss('discount-applied');
        }, 2000);
      } else {
        toast.error(data.message || 'Invalid promo code')
      }
    } catch (error) {
      toast.error('Failed to validate promo code')
    } finally {
      setValidatingPromo(false)
    }
  }

  // Calculate discounted price
  const getDiscountedPrice = (price: number) => {
    if (!appliedPromo || price === 0) return price
    if (appliedPromo.discountType === 'percentage') {
      return price * (1 - appliedPromo.discountValue / 100)
    }
    return Math.max(0, price - appliedPromo.discountValue)
  }

  // Handle subscription
  const handleSubscribe = async (planId: string, priceId?: string) => {
    // Track upgrade button clicked
    analytics.upgradeClicked(planId)

    if (planId === 'free') {
      router.push('/dashboard')
      return
    }

    if (planId === 'business') {
      window.location.href = 'mailto:enquiries@buildflow-ai.app?subject=Business Plan Inquiry'
      return
    }

    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }

    if (!priceId) {
      toast.error('Plan not available')
      return
    }

    // Get price for analytics
    const plan = PLANS.find(p => p.id === planId)
    const price = plan?.price || 0

    setLoading(planId)
    try {
      // Track checkout started
      analytics.checkoutStarted(planId, price)

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          promoCode: appliedPromo?.code,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that's right for you. Upgrade or downgrade at any time.
            </p>
          </div>

          {/* Promo Code Input */}
          <div className="max-w-md mx-auto mb-12">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={applyPromoCode}
                disabled={validatingPromo}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {validatingPromo ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
            {appliedPromo && (
              <div className="mt-2 text-green-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>
                  {appliedPromo.discountValue}% discount with code {appliedPromo.code}
                </span>
                <button
                  onClick={() => setAppliedPromo(null)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PLANS.map((plan) => {
              const discountedPrice = getDiscountedPrice(plan.price)
              const hasDiscount = appliedPromo && plan.price > 0 && discountedPrice < plan.price

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-2xl ${
                    plan.popular ? 'ring-2 ring-purple-600 scale-105' : 'border border-gray-100'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 text-sm font-medium rounded-bl-xl">
                      Most Popular
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 mb-6">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-8">
                      {hasDiscount && (
                        <div className="text-gray-400 line-through text-lg">
                          ${plan.price}/mo
                        </div>
                      )}
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">
                          ${hasDiscount ? discountedPrice.toFixed(0) : plan.price}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-gray-600 ml-2">/month</span>
                        )}
                      </div>
                      {hasDiscount && (
                        <div className="text-green-600 text-sm mt-1">
                          Save ${(plan.price - discountedPrice).toFixed(0)}/mo
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSubscribe(plan.id, plan.priceId)}
                      disabled={loading === plan.id}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      ) : (
                        plan.cta
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pay-as-you-go Credits */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Pay-as-you-go
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Need More Credits?
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Top up anytime. Credits never expire and work across all plans. Each credit = one AI generation.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-white rounded-2xl shadow-md border p-6 flex flex-col hover:shadow-xl transition-all ${
                    pkg.badge ? 'border-purple-400 ring-2 ring-purple-400' : 'border-gray-100'
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      {pkg.badge}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold text-gray-900">${pkg.price}</span>
                    <span className="text-gray-500 text-sm">one-time</span>
                  </div>
                  <p className="text-purple-600 font-semibold mb-1">{pkg.credits} credits</p>
                  <p className="text-gray-400 text-xs mb-6">{pkg.perCredit} per credit</p>
                  <button
                    onClick={() => handleBuyCredits(pkg.id)}
                    disabled={buyingCredits === pkg.id}
                    className={`mt-auto w-full py-3 rounded-xl font-semibold transition-all text-sm ${
                      pkg.badge
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {buyingCredits === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      `Buy ${pkg.credits} Credits`
                    )}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-400 text-sm mt-6">
              Credits are added to your account instantly after purchase.
            </p>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-gray-600">
                  Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600">
                  We accept all major credit cards, debit cards, and PayPal through our secure payment partner Stripe.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Is there a free trial?
                </h3>
                <p className="text-gray-600">
                  Our Free plan lets you try all basic features. Upgrade when you're ready for more power!
                </p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 text-center">
            <p className="text-gray-500 mb-4">Trusted by developers worldwide</p>
            <div className="flex justify-center items-center gap-8 text-gray-400">
              <span>🔒 Secure Payments</span>
              <span>💳 Stripe Powered</span>
              <span>🌍 Global Access</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
