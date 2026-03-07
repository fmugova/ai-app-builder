'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from 'lucide-react'

interface WebhookEvent {
  id: string
  provider: string
  eventType: string
  eventId: string | null
  status: string
  error: string | null
  attempts: number
  retryAt: string | null
  createdAt: string
  processedAt: string | null
  userId: string | null
}

interface WebhookEventDetail extends WebhookEvent {
  payload: unknown
  metadata: unknown
}

interface WebhookStats {
  total: number
  processed: number
  failed: number
  pending: number
  manualReview: number
  successRate: string
}

const STATUS_COLORS: Record<string, string> = {
  processed: 'bg-green-900/40 text-green-300 border border-green-700',
  failed: 'bg-red-900/40 text-red-300 border border-red-700',
  pending: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  manual_review: 'bg-orange-900/40 text-orange-300 border border-orange-700',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  processed: <CheckCircle className="w-3.5 h-3.5" />,
  failed: <XCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  manual_review: <AlertTriangle className="w-3.5 h-3.5" />,
}

export default function WebhooksDashboard() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Filters
  const [filterProvider, setFilterProvider] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEventType, setFilterEventType] = useState('')
  const [filterHours, setFilterHours] = useState('24')
  const [searchTerm, setSearchTerm] = useState('')

  // Auth guard
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [session, sessionStatus, router])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const params = new URLSearchParams({ action: 'stats', hours: filterHours })
      if (filterProvider) params.set('provider', filterProvider)
      const res = await fetch(`/api/admin/webhooks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      setStats(await res.json())
    } catch {
      toast.error('Failed to load webhook stats')
    } finally {
      setStatsLoading(false)
    }
  }, [filterProvider, filterHours])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filterProvider) params.set('provider', filterProvider)
      if (filterStatus) params.set('status', filterStatus)
      if (filterEventType) params.set('eventType', filterEventType)
      const res = await fetch(`/api/admin/webhooks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      toast.error('Failed to load webhook events')
    } finally {
      setLoading(false)
    }
  }, [filterProvider, filterStatus, filterEventType])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    fetchStats()
    fetchEvents()
  }, [sessionStatus, fetchStats, fetchEvents])

  const openDetail = async (id: string) => {
    if (selectedEvent?.id === id) {
      setSelectedEvent(null)
      return
    }
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/webhooks?action=get&id=${id}`)
      if (!res.ok) throw new Error('Failed to load event detail')
      setSelectedEvent(await res.json())
    } catch {
      toast.error('Failed to load event detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRetry = async (id: string) => {
    setRetryingId(id)
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Retry failed')
      toast.success('Webhook queued for retry')
      await Promise.all([fetchEvents(), fetchStats()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetryingId(null)
    }
  }

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      e.id.toLowerCase().includes(q) ||
      e.provider.toLowerCase().includes(q) ||
      e.eventType.toLowerCase().includes(q) ||
      (e.eventId ?? '').toLowerCase().includes(q)
    )
  })

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Admin
          </button>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold">Webhook Monitor</h1>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => { fetchStats(); fetchEvents() }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats?.total, color: 'text-white' },
            { label: 'Processed', value: stats?.processed, color: 'text-green-400' },
            { label: 'Failed', value: stats?.failed, color: 'text-red-400' },
            { label: 'Pending', value: stats?.pending, color: 'text-yellow-400' },
            { label: 'Success Rate', value: stats?.successRate, color: 'text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>
                {statsLoading ? '—' : (s.value ?? 0)}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              Filters
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Provider</label>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All providers</option>
                <option value="stripe">Stripe</option>
                <option value="github">GitHub</option>
                <option value="vercel">Vercel</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All statuses</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="manual_review">Manual Review</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Event Type</label>
              <input
                type="text"
                placeholder="e.g. checkout.session.completed"
                value={filterEventType}
                onChange={(e) => setFilterEventType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-56"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Stats window</label>
              <select
                value={filterHours}
                onChange={(e) => setFilterHours(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="1">Last 1h</option>
                <option value="6">Last 6h</option>
                <option value="24">Last 24h</option>
                <option value="168">Last 7d</option>
              </select>
            </div>

            <button
              onClick={() => { fetchStats(); fetchEvents() }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition mt-auto"
            >
              Apply
            </button>

            <button
              onClick={() => {
                setFilterProvider('')
                setFilterStatus('')
                setFilterEventType('')
                setFilterHours('24')
                setSearchTerm('')
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition mt-auto"
            >
              Reset
            </button>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by ID, provider, event type, or event ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Events table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold">
              Events
              {!loading && (
                <span className="ml-2 text-sm text-gray-500">
                  ({filteredEvents.length} shown)
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No webhook events found.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredEvents.map((event) => (
                <div key={event.id} className="group">
                  <div
                    className="px-6 py-4 hover:bg-gray-800/50 cursor-pointer transition grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center"
                    onClick={() => openDetail(event.id)}
                  >
                    {/* Left: provider + type + id */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{event.provider}</span>
                        <span className="text-gray-500 text-xs">·</span>
                        <span className="text-sm text-gray-300 truncate">{event.eventType}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {event.id}
                        {event.eventId && <span className="ml-2 text-gray-600">ext: {event.eventId}</span>}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[event.status] ?? 'bg-gray-700 text-gray-300'}`}
                    >
                      {STATUS_ICONS[event.status]}
                      {event.status.replace('_', ' ')}
                    </span>

                    {/* Attempts */}
                    <span className="text-xs text-gray-500">
                      {event.attempts} attempt{event.attempts !== 1 ? 's' : ''}
                    </span>

                    {/* Time */}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {(event.status === 'failed' || event.status === 'manual_review') && (
                        <button
                          onClick={() => handleRetry(event.id)}
                          disabled={retryingId === event.id}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs transition"
                        >
                          {retryingId === event.id ? (
                            <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Retry
                        </button>
                      )}
                      <button className="text-gray-500 hover:text-white transition">
                        {selectedEvent?.id === event.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detail panel */}
                  {selectedEvent?.id === event.id && (
                    <div className="px-6 pb-5 bg-gray-800/30 border-t border-gray-800">
                      {detailLoading ? (
                        <div className="py-6 flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                        </div>
                      ) : (
                        <div className="pt-4 grid md:grid-cols-2 gap-6">
                          {/* Meta */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                              Event Details
                            </h4>
                            <dl className="space-y-2 text-sm">
                              {[
                                ['ID', selectedEvent.id],
                                ['Provider', selectedEvent.provider],
                                ['Event Type', selectedEvent.eventType],
                                ['External ID', selectedEvent.eventId ?? '—'],
                                ['Status', selectedEvent.status],
                                ['Attempts', String(selectedEvent.attempts)],
                                ['User ID', selectedEvent.userId ?? '—'],
                                ['Created', new Date(selectedEvent.createdAt).toLocaleString()],
                                ['Processed', selectedEvent.processedAt ? new Date(selectedEvent.processedAt).toLocaleString() : '—'],
                                ['Next Retry', selectedEvent.retryAt ? new Date(selectedEvent.retryAt).toLocaleString() : '—'],
                              ].map(([label, val]) => (
                                <div key={label} className="flex gap-3">
                                  <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
                                  <dd className="text-gray-200 font-mono text-xs break-all">{val}</dd>
                                </div>
                              ))}
                            </dl>

                            {selectedEvent.error && (
                              <div className="mt-4">
                                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                                  Error
                                </h4>
                                <pre className="text-xs text-red-300 bg-red-950/30 border border-red-900/50 rounded p-3 overflow-auto max-h-32">
                                  {selectedEvent.error}
                                </pre>
                              </div>
                            )}
                          </div>

                          {/* Payload */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                              Payload
                            </h4>
                            <pre className="text-xs text-gray-300 bg-gray-900 border border-gray-700 rounded p-3 overflow-auto max-h-72">
                              {JSON.stringify(selectedEvent.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
