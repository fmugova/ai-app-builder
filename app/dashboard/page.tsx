'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, LogOut, CreditCard, Plus, Loader2 } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    window.location.href = '/api/auth/signout'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    )
  }

  const generationsRemaining = subscription?.generationsLimit === -1 
    ? 'Unlimited' 
    : (subscription?.generationsLimit - subscription?.generationsUsed) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI App Builder
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back!</p>
                <p className="font-semibold text-gray-900">User</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Current Plan</h3>
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {subscription?.plan || 'Free'}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-semibold"
            >
              Upgrade Plan →
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Generations Used</h3>
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {subscription?.generationsUsed || 0} / {subscription?.generationsLimit === -1 ? '∞' : subscription?.generationsLimit || 3}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {generationsRemaining} remaining
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Quick Actions</h3>
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <button
              onClick={() => router.push('/builder')}
              className="mt-2 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition"
            >
              New Project
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to Build Something Amazing?
            </h2>
            <p className="text-gray-600 mb-6">
              Start a new project or continue where you left off
            </p>
            <button
              onClick={() => router.push('/builder')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Project
            </button>
          </div>
        </div>

        {subscription && subscription.generationsUsed >= subscription.generationsLimit && subscription.generationsLimit !== -1 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-bold text-yellow-900 mb-2">Generation Limit Reached</h3>
            <p className="text-yellow-800 mb-4">
              You've used all your generations for this month. Upgrade to continue building!
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition"
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}