'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface PromoCodeInputProps {
  plan: string
  onValidCode: (code: string, stripeCouponId: string, message: string) => void
  onClearCode: () => void
}

export default function PromoCodeInput({ plan, onValidCode, onClearCode }: PromoCodeInputProps) {
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [discountMessage, setDiscountMessage] = useState<string | null>(null)

  const validatePromoCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter a promo code')
      return
    }

    setIsValidating(true)

    try {
      const response = await fetch('/api/stripe/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), plan }),
      })

      const data = await response.json()

      if (data.valid) {
        setAppliedCode(code.toUpperCase())
        setDiscountMessage(data.message)
        toast.success(data.message)
        onValidCode(code.toUpperCase(), data.stripeCouponId, data.message)
      } else {
        toast.error(data.error || 'Invalid promo code')
      }
    } catch (error) {
      console.error('Promo validation error:', error)
      toast.error('Failed to validate promo code')
    } finally {
      setIsValidating(false)
    }
  }

  const removePromoCode = () => {
    setCode('')
    setAppliedCode(null)
    setDiscountMessage(null)
    onClearCode()
    toast.success('Promo code removed')
  }

  if (appliedCode) {
    return (
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              ✓ Promo Code Applied
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {discountMessage}
            </p>
          </div>
          <button
            onClick={removePromoCode}
            className="text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Have a promo code?
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && validatePromoCode()}
          placeholder="Enter code"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isValidating}
        />
        <button
          onClick={validatePromoCode}
          disabled={isValidating || !code.trim()}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          {isValidating ? 'Validating...' : 'Apply'}
        </button>
      </div>
    </div>
  )
}
