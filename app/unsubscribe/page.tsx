'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email')
  
  const [email, setEmail] = useState(emailFromUrl || '')
  const [loading, setLoading] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(false)

  const handleUnsubscribe = async () => {
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.ok) {
        setUnsubscribed(true)
        toast.success('Successfully unsubscribed')
      } else {
        toast.error(data.error || 'Failed to unsubscribe')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full">
      {!unsubscribed && (
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📭</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Unsubscribe
            </h1>
            <p className="text-gray-600">
              Sorry to see you go. You will stop receiving emails from BuildFlow.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!!emailFromUrl}
              />
            </div>

            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>

            <div className="text-center">
              <a href="/" className="text-sm text-purple-600 hover:text-purple-700">
                Back to BuildFlow
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Changed your mind? You can always resubscribe later from our website.
            </p>
          </div>
        </div>
      )}

      {unsubscribed && (
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You are Unsubscribed
          </h1>
          <p className="text-gray-600 mb-6">
            You will not receive any more emails from BuildFlow.
          </p>

          <div className="space-y-3">
            <a href="/" className="block w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition">
              Return to BuildFlow
            </a>
            
            <p className="text-sm text-gray-500">
              Unsubscribed by mistake?{' '}
              <button
                onClick={() => {
                  setUnsubscribed(false)
                  setEmail('')
                }}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Resubscribe here
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
      <Toaster position="top-right" />
      
      <Suspense fallback={
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <UnsubscribeContent />
      </Suspense>
    </div>
  )
}