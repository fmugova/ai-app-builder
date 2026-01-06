'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import PromoCodeInput from './PromoCodeInput'

interface PricingCardProps {
  name: string
  price: number
  priceId: string | null
  features: string[]
  popular?: boolean
  currentPlan?: boolean
}

export default function PricingCard({ 
  name, 
  price, 
  priceId, 
  features, 
  popular = false,
  currentPlan = false 
}: PricingCardProps) {
  const [loading, setLoading] = useState(false)
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [stripeCouponId, setStripeCouponId] = useState<string | null>(null)
  const [discountMessage, setDiscountMessage] = useState<string | null>(null)

  const handleValidPromo = (code: string, couponId: string, message: string) => {
    setPromoCode(code)
    setStripeCouponId(couponId)
    setDiscountMessage(message)
  }

  const handleClearPromo = () => {
    setPromoCode(null)
    setStripeCouponId(null)
    setDiscountMessage(null)
  }

  const handleSubscribe = async () => {
    if (!priceId) return

    setLoading(true)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: name.toLowerCase(),
          priceId,
          promoCode: stripeCouponId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div className={`relative bg-white rounded-2xl shadow-lg p-8 ${popular ? 'ring-2 ring-purple-600 scale-105' : ''}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Most Popular
        </div>
      )}

      {currentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Current Plan
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-gray-900">${price}</span>
          <span className="text-gray-600">/month</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {!currentPlan && price > 0 && priceId && (
        <PromoCodeInput
          plan={name.toLowerCase()}
          onValidCode={handleValidPromo}
          onClearCode={handleClearPromo}
        />
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading || currentPlan || !priceId}
        className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
          !currentPlan && price > 0 && priceId ? 'mt-4' : 'mt-0'
        } ${
          currentPlan
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : popular
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
            : 'bg-gray-800 text-white hover:bg-gray-900'
        } disabled:opacity-50`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : currentPlan ? (
          'Current Plan'
        ) : price === 0 ? (
          'Get Started'
        ) : (
          'Subscribe Now'
        )}
      </button>
    </div>
  )
}