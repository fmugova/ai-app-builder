'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BillingData {
  tier: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  projectsUsed: number
  projectsLimit: number
  generationsUsed: number
  generationsLimit: number
  invoices: Array<{
    id: string
    amount: number
    status: string
    date: string
    period: string
  }>
}

interface BillingClientProps {
  userEmail: string
}

export default function BillingClient({ userEmail }: BillingClientProps) {
  const router = useRouter()
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/billing')
      if (!res.ok) throw new Error('Failed to fetch billing data')
      const data = await res.json()
      setBillingData(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTierPrice = (tier: string) => {
    switch(tier) {
      case 'enterprise': return 99
      case 'business': return 49
      case 'pro': return 19
      default: return 0
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'from-purple-500 to-pink-500'
      case 'business': return 'from-blue-500 to-cyan-500'
      case 'pro': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getTierFeatures = (tier: string) => {
    switch(tier) {
      case 'enterprise':
        return {
          projects: '999',
          generations: '999',
          features: ['Unlimited projects', 'Unlimited AI generations', 'Priority support', 'Custom domains', 'White-label', 'API access']
        }
      case 'business':
        return {
          projects: '100',
          generations: '500',
          features: ['100 projects/month', '500 AI generations', 'Custom domains', 'Analytics', 'Priority support']
        }
      case 'pro':
        return {
          projects: '20',
          generations: '100',
          features: ['20 projects/month', '100 AI generations', 'Custom domains', 'Analytics']
        }
      default:
        return {
          projects: '3',
          generations: '10',
          features: ['3 projects/month', '10 AI generations', 'Basic support']
        }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading billing information...</div>
      </div>
    )
  }

  if (error || !billingData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Failed to load billing information</p>
          <button
            onClick={() => fetchBillingData()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const projectsPercentage = getUsagePercentage(billingData.projectsUsed, billingData.projectsLimit)
  const generationsPercentage = getUsagePercentage(billingData.generationsUsed, billingData.generationsLimit)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="text-gray-400 hover:text-white transition"
              >
                ← Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-700" />
              <h1 className="text-xl font-bold text-white">Billing & Subscription</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Current Plan */}
        <div className={`bg-gradient-to-br ${getTierColor(billingData.tier)} rounded-2xl p-8 mb-8 border border-gray-700`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 capitalize">{billingData.tier} Plan</h2>
              <p className="text-white/80 mb-4">
                {billingData.tier === 'free' ? 'Free forever' : `$${getTierPrice(billingData.tier)}/month`}
              </p>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <span>📧 {userEmail}</span>
                {billingData.status === 'active' && <span className="px-2 py-1 bg-white/20 rounded">✓ Active</span>}
              </div>
            </div>
            {billingData.tier === 'free' && (
              <Link
                href="/pricing"
                className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold transition"
              >
                Upgrade Plan
              </Link>
            )}
          </div>

          {billingData.tier !== 'free' && (
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-white/90 text-sm">
                <span>Current billing period</span>
                <span className="font-medium">
                  {formatDate(billingData.currentPeriodStart)} - {formatDate(billingData.currentPeriodEnd)}
                </span>
              </div>
              {billingData.cancelAtPeriodEnd && (
                <p className="text-yellow-300 text-sm mt-2">
                  ⚠️ Your subscription will be cancelled at the end of this billing period
                </p>
              )}
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Projects</p>
                  <p className="text-2xl font-bold text-white">
                    {billingData.projectsUsed}/{billingData.projectsLimit}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(projectsPercentage)}`} 
                  style={{ width: `${projectsPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">{projectsPercentage.toFixed(0)}% used this month</p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">AI Generations</p>
                  <p className="text-2xl font-bold text-white">
                    {billingData.generationsUsed}/{billingData.generationsLimit}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(generationsPercentage)}`} 
                  style={{ width: `${generationsPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">{generationsPercentage.toFixed(0)}% used this month</p>
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6">Your Plan Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getTierFeatures(billingData.tier).features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Available Plans */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Available Plans</h3>
            <Link
              href="/pricing"
              className="text-purple-400 hover:text-purple-300 text-sm font-medium"
            >
              View all plans →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['pro', 'business', 'enterprise'].map((tier) => {
              const features = getTierFeatures(tier)
              const isCurrent = billingData.tier === tier
              
              return (
                <div
                  key={tier}
                  className={`border rounded-xl p-6 ${
                    isCurrent
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-white capitalize mb-2">{tier}</h4>
                    <p className="text-3xl font-bold text-white">${getTierPrice(tier)}<span className="text-sm text-gray-400">/mo</span></p>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="text-sm text-gray-400">
                      <span className="text-white font-medium">{features.projects}</span> projects/month
                    </div>
                    <div className="text-sm text-gray-400">
                      <span className="text-white font-medium">{features.generations}</span> AI generations
                    </div>
                  </div>

                  {isCurrent ? (
                    <button className="w-full py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed" disabled>
                      Current Plan
                    </button>
                  ) : (
                    <Link
                      href="/pricing"
                      className="block w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center font-medium transition"
                    >
                      {billingData.tier === 'free' ? 'Upgrade' : 'Change Plan'}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Invoices */}
        {(billingData.invoices?.length ?? 0) > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Billing History</h3>
            <div className="space-y-3">
              {billingData.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                >
                  <div>
                    <p className="text-white font-medium">{invoice.period}</p>
                    <p className="text-sm text-gray-400">{formatDate(invoice.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${invoice.amount.toFixed(2)}</p>
                    <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded capitalize">
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage Subscription */}
        {billingData.tier !== 'free' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mt-8">
            <h3 className="text-xl font-bold text-white mb-6">Manage Subscription</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="text-white font-medium">Payment Method</p>
                  <p className="text-sm text-gray-400">Manage your payment methods</p>
                </div>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm">
                  Update
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="text-white font-medium">Billing Information</p>
                  <p className="text-sm text-gray-400">Update your billing details</p>
                </div>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm">
                  Edit
                </button>
              </div>

              {!billingData.cancelAtPeriodEnd && (
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">Cancel Subscription</p>
                    <p className="text-sm text-gray-400">Cancel your subscription at the end of the billing period</p>
                  </div>
                  <button className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-300 rounded-lg transition text-sm">
                    Cancel Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
