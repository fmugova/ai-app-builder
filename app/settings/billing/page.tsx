"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Calendar, TrendingUp, Download, ArrowLeft } from 'lucide-react'

interface BillingInfo {
  tier: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  projectsUsed: number
  projectsLimit: number
  generationsUsed: number
  generationsLimit: number
  invoices: Invoice[]
}

interface Invoice {
  id: string
  amount: number
  status: string
  date: string
  period: string
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    loadBillingInfo()
  }, [session, status])

  const loadBillingInfo = async () => {
    try {
      const res = await fetch('/api/billing')
      if (res.ok) {
        const data = await res.json()
        setBilling(data)
      }
    } catch (error) {
      console.error('Failed to load billing info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading billing info...</p>
        </div>
      </div>
    )
  }

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'enterprise': return 'from-purple-500 to-pink-500'
      case 'business': return 'from-blue-500 to-cyan-500'
      case 'pro': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getTierPrice = (tier: string) => {
    switch(tier) {
      case 'enterprise': return 99
      case 'business': return 49
      case 'pro': return 19
      default: return 0
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
          <p className="text-gray-400">Manage your subscription and billing information</p>
        </div>

        {/* Current Plan */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 bg-gradient-to-br ${getTierColor(billing?.tier || 'free')} rounded-xl flex items-center justify-center`}>
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white capitalize">{billing?.tier || 'Free'} Plan</h2>
                <p className="text-gray-400 text-sm">
                  {billing?.status === 'active' ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Monthly Cost</span>
                <span className="text-2xl font-bold text-white">
                  ${getTierPrice(billing?.tier || 'free')}
                  <span className="text-sm text-gray-400">/month</span>
                </span>
              </div>

              {billing?.currentPeriodEnd && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <span className="text-gray-400">Next billing date</span>
                  <span className="text-white">
                    {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}

              {billing?.tier !== 'free' && (
                <Link
                  href="/pricing"
                  className="block w-full text-center py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition mt-4"
                >
                  Change Plan
                </Link>
              )}
              
              {billing?.tier === 'free' && (
                <Link
                  href="/pricing"
                  className="block w-full text-center py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition mt-4"
                >
                  Upgrade Plan
                </Link>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Usage This Month</h2>
                <p className="text-gray-400 text-sm">Track your resource consumption</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Projects Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Projects</span>
                  <span className="text-white font-medium">
                    {String(billing?.projectsUsed || 0)} / {String(billing?.projectsLimit || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${billing?.projectsLimit ? (billing.projectsUsed / billing.projectsLimit * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>

              {/* Generations Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">AI Generations</span>
                  <span className="text-white font-medium">
                    {String(billing?.generationsUsed || 0)} / {String(billing?.generationsLimit || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${billing?.generationsLimit ? (billing.generationsUsed / billing.generationsLimit * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Billing History</h2>
          
          {billing?.tier === 'free' ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No billing history on free plan</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Upgrade to Pro
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {billing?.invoices && billing.invoices.length > 0 ? (
                    billing.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-4 text-gray-300">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-gray-300">{invoice.period}</td>
                        <td className="px-4 py-4 text-white font-medium">
                          ${invoice.amount}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' 
                              ? 'bg-green-900 text-green-200'
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button className="text-blue-400 hover:text-blue-300 transition">
                            <Download className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No invoices yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
