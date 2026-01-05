'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  segment: string
  totalSent: number
  totalOpened: number
  totalClicked: number
  scheduledFor: string | null
  sentAt: string | null
  createdAt: string
}

interface Subscriber {
  id: string
  email: string
  name: string | null
  status: string
  subscribedAt: string
}


export default function CampaignsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'subscribers'>('campaigns')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setCheckingAdmin(true)
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false)
      }
    }
    if (session?.user?.email) {
      checkAdmin()
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (status === 'loading' || checkingAdmin) return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!isAdmin) {
      router.push('/dashboard')
      return
    }

    loadData()
  }, [session, status, isAdmin, checkingAdmin])

  const loadData = async () => {
    try {
      const [campaignsRes, subscribersRes] = await Promise.all([
        fetch('/api/admin/campaigns'),
        fetch('/api/admin/campaigns/subscribers')
      ])

      if (campaignsRes.ok) {
        const data = await campaignsRes.json()
        setCampaigns(Array.isArray(data) ? data : [])
      }

      if (subscribersRes.ok) {
        const data = await subscribersRes.json()
        setSubscribers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const activeSubscribers = subscribers.filter(s => s.status === 'active')
  const openRate = campaigns.length > 0 
    ? ((campaigns.reduce((acc, c) => acc + c.totalOpened, 0) / 
        campaigns.reduce((acc, c) => acc + c.totalSent, 0)) * 100).toFixed(1)
    : '0'

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <span className="text-2xl">📧</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-purple-400">Email Campaigns</h1>
                  <p className="text-sm text-gray-400">Newsletter & Marketing Hub</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/admin/campaigns/new')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition font-medium"
                >
                  + New Campaign
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  Back to Admin
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Subscribers</span>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-3xl font-bold">{activeSubscribers.length}</p>
              <p className="text-xs text-green-400 mt-1">
                +{subscribers.filter(s => {
                  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                  return new Date(s.subscribedAt) > dayAgo && s.status === 'active'
                }).length} today
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Campaigns Sent</span>
                <span className="text-2xl">📨</span>
              </div>
              <p className="text-3xl font-bold">
                {campaigns.filter(c => c.status === 'sent').length}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {campaigns.filter(c => c.status === 'draft').length} drafts
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Open Rate</span>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold">{openRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Average across all campaigns</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Emails Sent</span>
                <span className="text-2xl">✉️</span>
              </div>
              <p className="text-3xl font-bold">
                {campaigns.reduce((acc, c) => acc + c.totalSent, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Lifetime</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'campaigns'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Campaigns ({campaigns.length})
            </button>
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'subscribers'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Subscribers ({activeSubscribers.length})
            </button>
          </div>

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">All Campaigns</h3>
                <button
                  onClick={() => router.push('/admin/campaigns/new')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-sm"
                >
                  + Create Campaign
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-4">📧</p>
                  <p className="text-gray-400 mb-4">No campaigns yet</p>
                  <button
                    onClick={() => router.push('/admin/campaigns/new')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                  >
                    Create Your First Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 bg-gray-900 rounded-xl border border-gray-700 hover:border-purple-500 transition cursor-pointer"
                      onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-white">{campaign.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'sent' ? 'bg-green-900 text-green-200' :
                              campaign.status === 'scheduled' ? 'bg-blue-900 text-blue-200' :
                              campaign.status === 'sending' ? 'bg-yellow-900 text-yellow-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {campaign.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">{campaign.subject}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Segment: {campaign.segment}</span>
                            {campaign.totalSent > 0 && (
                              <>
                                <span>•</span>
                                <span>{campaign.totalSent} sent</span>
                                <span>•</span>
                                <span>{campaign.totalOpened} opened ({((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1)}%)</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {campaign.sentAt 
                              ? `Sent ${new Date(campaign.sentAt).toLocaleDateString()}`
                              : campaign.scheduledFor
                              ? `Scheduled for ${new Date(campaign.scheduledFor).toLocaleDateString()}`
                              : `Created ${new Date(campaign.createdAt).toLocaleDateString()}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subscribers Tab */}
          {activeTab === 'subscribers' && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Newsletter Subscribers</h3>
                <button
                  onClick={() => {
                    // Export subscribers to CSV
                    const csv = [
                      ['Email', 'Name', 'Status', 'Subscribed At'].join(','),
                      ...subscribers.map(s => [
                        s.email,
                        s.name || 'N/A',
                        s.status,
                        new Date(s.subscribedAt).toLocaleDateString()
                      ].join(','))
                    ].join('\n')
                    
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    window.URL.revokeObjectURL(url)
                    toast.success('Subscribers exported!', {
                      duration: 2000,
                      id: 'subscribers-exported',
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
                >
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-4 text-sm text-white">{subscriber.email}</td>
                        <td className="px-4 py-4 text-sm text-gray-300">{subscriber.name || '-'}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            subscriber.status === 'active' ? 'bg-green-900 text-green-200' :
                            'bg-red-900 text-red-200'
                          }`}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400">
                          {new Date(subscriber.subscribedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}