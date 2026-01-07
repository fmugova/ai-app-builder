'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  UserMinus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft
} from 'lucide-react'

interface SubscriptionAnalytics {
  mrr: {
    total: number
    growth: number
    byPlan: {
      plan: string
      revenue: number
      count: number
    }[]
  }
  subscriptions: {
    total: number
    active: number
    byTier: {
      tier: string
      count: number
      percentage: number
    }[]
  }
  churn: {
    rate: number
    count: number
    period: string
  }
  trends: {
    upgrades: number
    downgrades: number
    newSubscriptions: number
    cancellations: number
  }
  revenueByPlan: {
    plan: string
    revenue: number
    subscribers: number
    averageValue: number
  }[]
  monthlyTrends: {
    month: string
    mrr: number
    newSubs: number
    churnedSubs: number
  }[]
}

export default function SubscriptionAnalyticsPage() {
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    checkAdminAndLoadData()
  }, [session, status, period])

  const checkAdminAndLoadData = async () => {
    try {
      const adminCheck = await fetch('/api/admin/check')
      const adminData = await adminCheck.json()

      if (!adminData.isAdmin) {
        router.push('/dashboard')
        return
      }

      loadAnalytics()
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/dashboard')
    }
  }

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics/subscriptions?period=${period}`)
      
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Admin"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-400">Subscription Analytics</h1>
                <p className="text-sm text-gray-400">Business metrics and revenue insights</p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 bg-gray-700 rounded-lg p-1">
              {(['7d', '30d', '90d', '1y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total MRR */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-900/30 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total MRR</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(analytics.mrr.total)}</p>
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              analytics.mrr.growth >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {analytics.mrr.growth >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(analytics.mrr.growth)} vs last period</span>
            </div>
          </div>

          {/* Active Subscriptions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-900/30 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-white">{analytics.subscriptions.active}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              {analytics.subscriptions.total} total subscriptions
            </p>
          </div>

          {/* Churn Rate */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-900/30 p-3 rounded-lg">
                  <UserMinus className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Churn Rate</p>
                  <p className="text-2xl font-bold text-white">{analytics.churn.rate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              {analytics.churn.count} churned {analytics.churn.period}
            </p>
          </div>

          {/* Net Growth */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-900/30 p-3 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Net Growth</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.trends.newSubscriptions - analytics.trends.cancellations}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              +{analytics.trends.newSubscriptions} new, -{analytics.trends.cancellations} cancelled
            </p>
          </div>
        </div>

        {/* Upgrade/Downgrade Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-green-400" />
              Upgrade & Downgrade Trends
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-900/20 rounded-lg border border-green-800">
                <div className="flex items-center gap-3">
                  <div className="bg-green-900/50 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Upgrades</p>
                    <p className="text-xl font-bold text-green-400">{analytics.trends.upgrades}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-orange-900/20 rounded-lg border border-orange-800">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-900/50 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Downgrades</p>
                    <p className="text-xl font-bold text-orange-400">{analytics.trends.downgrades}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Upgrade Rate</span>
                  <span className={`font-medium ${
                    analytics.trends.upgrades > analytics.trends.downgrades 
                      ? 'text-green-400' 
                      : 'text-orange-400'
                  }`}>
                    {analytics.trends.upgrades > analytics.trends.downgrades ? '✓' : '⚠'} 
                    {' '}
                    {(
                      (analytics.trends.upgrades / 
                      (analytics.trends.upgrades + analytics.trends.downgrades || 1)) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscriptions by Tier */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-400" />
              Subscriptions by Tier
            </h3>
            <div className="space-y-3">
              {analytics.subscriptions.byTier.map((tier) => (
                <div key={tier.tier} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tier.tier === 'enterprise' ? 'bg-purple-900 text-purple-200' :
                        tier.tier === 'business' ? 'bg-blue-900 text-blue-200' :
                        tier.tier === 'pro' ? 'bg-green-900 text-green-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {tier.tier.toUpperCase()}
                      </span>
                      <span className="text-gray-400">{tier.count} subscriptions</span>
                    </div>
                    <span className="font-medium text-white">{tier.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        tier.tier === 'enterprise' ? 'bg-purple-500' :
                        tier.tier === 'business' ? 'bg-blue-500' :
                        tier.tier === 'pro' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${tier.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-400" />
            Revenue by Plan
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 text-sm font-medium text-gray-400">Plan</th>
                  <th className="pb-3 text-sm font-medium text-gray-400">Subscribers</th>
                  <th className="pb-3 text-sm font-medium text-gray-400">Total Revenue</th>
                  <th className="pb-3 text-sm font-medium text-gray-400">Avg Value</th>
                  <th className="pb-3 text-sm font-medium text-gray-400">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {analytics.revenueByPlan.map((plan) => {
                  const sharePercentage = (plan.revenue / analytics.mrr.total) * 100
                  return (
                    <tr key={plan.plan} className="hover:bg-gray-700/50 transition">
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          plan.plan === 'ENTERPRISE' ? 'bg-purple-900 text-purple-200' :
                          plan.plan === 'BUSINESS' ? 'bg-blue-900 text-blue-200' :
                          plan.plan === 'PRO' ? 'bg-green-900 text-green-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {plan.plan}
                        </span>
                      </td>
                      <td className="py-4 text-white font-medium">{plan.subscribers}</td>
                      <td className="py-4 text-white font-bold">{formatCurrency(plan.revenue)}</td>
                      <td className="py-4 text-gray-300">{formatCurrency(plan.averageValue)}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[100px]">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${sharePercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 w-12">
                            {sharePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Monthly Revenue Trends
          </h3>
          <div className="space-y-4">
            {analytics.monthlyTrends.map((month, index) => {
              const maxMrr = Math.max(...analytics.monthlyTrends.map(m => m.mrr))
              const widthPercentage = (month.mrr / maxMrr) * 100
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-medium w-24">{month.month}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-green-400">+{month.newSubs} new</span>
                      <span className="text-red-400">-{month.churnedSubs} churned</span>
                      <span className="text-white font-bold">{formatCurrency(month.mrr)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-8 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${widthPercentage}%` }}
                    >
                      {widthPercentage > 20 && (
                        <span className="text-white text-xs font-bold">
                          {formatCurrency(month.mrr)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MRR Breakdown by Plan */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-8">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            MRR Breakdown by Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.mrr.byPlan.map((plan) => (
              <div key={plan.plan} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    plan.plan === 'ENTERPRISE' ? 'bg-purple-900 text-purple-200' :
                    plan.plan === 'BUSINESS' ? 'bg-blue-900 text-blue-200' :
                    plan.plan === 'PRO' ? 'bg-green-900 text-green-200' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {plan.plan}
                  </span>
                  <span className="text-sm text-gray-400">{plan.count} subs</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(plan.revenue)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-600 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        plan.plan === 'ENTERPRISE' ? 'bg-purple-500' :
                        plan.plan === 'BUSINESS' ? 'bg-blue-500' :
                        plan.plan === 'PRO' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${(plan.revenue / analytics.mrr.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {((plan.revenue / analytics.mrr.total) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
