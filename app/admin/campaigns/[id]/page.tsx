'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'

interface Campaign {
  id: string
  name: string
  subject: string
  previewText: string | null
  htmlContent: string
  status: string
  segment: string
  totalSent: number
  totalOpened: number
  totalClicked: number
  scheduledFor: string | null
  sentAt: string | null
  createdAt: string
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  const loadCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(data)
      } else {
        toast.error('Campaign not found')
        router.push('/admin/campaigns')
      }
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaign()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Enter test email address')
      return
    }

    try {
      toast.loading('Sending test email...', { id: 'test' })
      
      const res = await fetch(`/api/admin/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })

      if (res.ok) {
        toast.success('Test email sent!', {
          duration: 2000,
          id: 'test-email-sent',
        })
      } else {
        toast.error('Failed to send test', { id: 'test' })
      }
    } catch {
      toast.error('Error sending test', { id: 'test' })
    }
  }

  const handleSendCampaign = async () => {
    if (!confirm(`Send this campaign to all ${campaign?.segment} subscribers?\n\nThis action cannot be undone!`)) {
      return
    }

    setSending(true)

    try {
      toast.loading('Sending campaign...', { id: 'send' })
      
      const res = await fetch(`/api/admin/campaigns/${campaignId}/send`, {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Campaign sent to ${data.sentCount} subscribers!`, {
          duration: 2000,
          id: 'campaign-sent',
        })
        loadCampaign()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to send campaign', { id: 'send' })
      }
    } catch {
      toast.error('Error sending campaign', { id: 'send' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (!campaign) return null

  const openRate = campaign.totalSent > 0 
    ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1)
    : '0'

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/admin/campaigns')}
                  className="p-2 hover:bg-gray-700 rounded-lg transition"
                >
                  ← Back
                </button>
                <div>
                  <h1 className="text-2xl font-bold">{campaign.name}</h1>
                  <p className="text-sm text-gray-400">{campaign.subject}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {campaign.status === 'draft' && (
                  <button
                    onClick={handleSendCampaign}
                    disabled={sending}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition font-medium disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send Campaign'}
                  </button>
                )}
                
                {campaign.status === 'sent' && (
                  <span className="px-4 py-2 bg-green-900 text-green-200 rounded-lg font-medium">
                    ✓ Sent
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          {campaign.status === 'sent' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Total Sent</p>
                <p className="text-3xl font-bold">{campaign.totalSent}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Opened</p>
                <p className="text-3xl font-bold">{campaign.totalOpened}</p>
                <p className="text-xs text-green-400 mt-1">{openRate}%</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Clicked</p>
                <p className="text-3xl font-bold">{campaign.totalClicked}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Sent At</p>
                <p className="text-sm font-medium">
                  {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Test Send */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Send Test Email</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Preview this campaign in your inbox before sending
                </p>
                
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                  <button
                    onClick={handleSendTest}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Send Test
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Campaign Info</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-400">Segment</p>
                    <p className="font-medium capitalize">{campaign.segment}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p className="font-medium capitalize">{campaign.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Preview */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Email Preview</h3>
                
                <div className="bg-white rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={campaign.htmlContent}
                    className="w-full h-[600px] border-0"
                    title="Email Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}