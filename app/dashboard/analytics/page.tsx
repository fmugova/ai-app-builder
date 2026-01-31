'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface AnalyticsData {
  summary: {
    totalEvents: number
    pageViews: number
    formSubmissions: number
    conversionRate: string
  }
  eventsByDay: Array<{ date: string; count: number }>
  topEvents: Array<{ event: string; count: number }>
  topReferrers: Array<{ source: string; count: number }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchProjects()
      fetchAnalytics()
    }
  }, [status, days, selectedProject])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // FIX: Ensure correct API URL with type=site-stats
      const params = new URLSearchParams({ type: 'site-stats', days: days.toString() })
      if (selectedProject !== 'all') {
        params.append('projectId', selectedProject)
      }

      const response = await fetch(`/api/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err)
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Analytics</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!analytics ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No analytics data yet</h3>
            <p className="text-gray-600">
              Analytics will appear once your published sites start receiving traffic
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm font-medium text-gray-600 mb-1">Total Events</div>
                <div className="text-3xl font-bold text-gray-900">
                  {Number(analytics?.summary?.totalEvents || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm font-medium text-gray-600 mb-1">Page Views</div>
                <div className="text-3xl font-bold text-purple-600">
                  {Number(analytics?.summary?.pageViews || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm font-medium text-gray-600 mb-1">Form Submissions</div>
                <div className="text-3xl font-bold text-green-600">
                  {Number(analytics?.summary?.formSubmissions || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm font-medium text-gray-600 mb-1">Conversion Rate</div>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics?.summary?.conversionRate || '0'}%
                </div>
              </div>
            </div>

            {/* Events by Day Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Over Time</h3>
              {analytics?.eventsByDay && analytics.eventsByDay.length > 0 ? (
                <div className="space-y-2">
                  {analytics.eventsByDay.map((day, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full flex items-center justify-end px-3"
                          style={{
                            width: `${Math.max((day.count / Math.max(...analytics.eventsByDay.map(d => d.count))) * 100, 5)}%`
                          }}
                        >
                          <span className="text-sm font-medium text-white">{day.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No activity data yet</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Events */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Events</h3>
                {analytics?.topEvents && analytics.topEvents.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium text-sm">
                            {index + 1}
                          </div>
                          <span className="text-gray-900 font-medium">{event.event}</span>
                        </div>
                        <span className="text-gray-600 font-medium">{event.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No events yet</p>
                )}
              </div>

              {/* Traffic Sources */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Traffic Sources</h3>
                {analytics?.topReferrers && analytics.topReferrers.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topReferrers.map((referrer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium text-sm">
                            {index + 1}
                          </div>
                          <span className="text-gray-900 font-medium truncate max-w-[200px]">
                            {referrer.source}
                          </span>
                        </div>
                        <span className="text-gray-600 font-medium">{referrer.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No traffic sources yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
