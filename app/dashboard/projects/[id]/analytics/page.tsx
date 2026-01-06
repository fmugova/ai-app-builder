'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  BarChart3,
  Globe,
  Monitor,
  TrendingUp,
  Users,
  MapPin,
  Eye,
  ArrowLeft,
  Calendar,
  MousePointer,
  Activity,
  Smartphone,
  Laptop,
  Tablet
} from 'lucide-react'

interface ProjectAnalytics {
  project: {
    id: string
    name: string
    views: number
  }
  summary: {
    totalPageViews: number
    uniqueVisitors: number
    avgTimeOnPage: number
    bounceRate: number
    conversionRate: number
  }
  pageViewsOverTime: {
    date: string
    views: number
    visitors: number
  }[]
  topTrafficSources: {
    source: string
    referrer: string
    visits: number
    percentage: number
  }[]
  deviceBreakdown: {
    device: string
    count: number
    percentage: number
  }[]
  browserBreakdown: {
    browser: string
    count: number
    percentage: number
  }[]
  geographicDistribution: {
    country: string
    city: string
    count: number
    percentage: number
  }[]
  conversions: {
    formSubmissions: number
    buttonClicks: number
    linkClicks: number
    totalConversions: number
  }
  topPages: {
    page: string
    views: number
    avgTime: number
  }[]
}

export default function ProjectAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [error, setError] = useState<string | null>(null)
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    loadAnalytics()
  }, [session, status, period, projectId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${projectId}/analytics?period=${period}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        } else if (response.status === 403) {
          throw new Error('Access denied')
        }
        throw new Error('Failed to load analytics')
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      setError(error.message || 'Failed to load analytics')
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No analytics data available</p>
        </div>
      </div>
    )
  }

  const formatNumber = (num: number) => num.toLocaleString()
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />
      case 'tablet':
        return <Tablet className="w-5 h-5" />
      case 'desktop':
      default:
        return <Laptop className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/projects/${projectId}`}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-400">{analytics.project.name}</h1>
                  <p className="text-sm text-gray-400">Project Analytics</p>
                </div>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 bg-gray-700 rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-900/30 p-2 rounded-lg">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Page Views</p>
                <p className="text-2xl font-bold text-white">{formatNumber(analytics.summary.totalPageViews)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-900/30 p-2 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Unique Visitors</p>
                <p className="text-2xl font-bold text-white">{formatNumber(analytics.summary.uniqueVisitors)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-900/30 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Avg Time</p>
                <p className="text-2xl font-bold text-white">{formatTime(analytics.summary.avgTimeOnPage)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-orange-900/30 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Bounce Rate</p>
                <p className="text-2xl font-bold text-white">{formatPercentage(analytics.summary.bounceRate)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-900/30 p-2 rounded-lg">
                <MousePointer className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{formatPercentage(analytics.summary.conversionRate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Views Over Time */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Page Views Over Time
          </h3>
          <div className="space-y-3">
            {analytics.pageViewsOverTime.length > 0 ? (
              analytics.pageViewsOverTime.map((day, index) => {
                const maxViews = Math.max(...analytics.pageViewsOverTime.map(d => d.views))
                const widthPercentage = (day.views / maxViews) * 100
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-medium w-24">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-blue-400">{day.views} views</span>
                        <span className="text-purple-400">{day.visitors} visitors</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                      >
                        {widthPercentage > 15 && (
                          <span className="text-white text-xs font-bold">{day.views}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                No page view data for this period
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Traffic Sources */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-400" />
              Top Traffic Sources
            </h3>
            <div className="space-y-4">
              {analytics.topTrafficSources.length > 0 ? (
                analytics.topTrafficSources.map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{source.source}</p>
                        <p className="text-xs text-gray-400 truncate">{source.referrer}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-white font-bold">{source.visits}</p>
                        <p className="text-xs text-gray-400">{formatPercentage(source.percentage)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${source.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">No traffic source data</div>
              )}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-400" />
              Device Breakdown
            </h3>
            <div className="space-y-4">
              {analytics.deviceBreakdown.length > 0 ? (
                analytics.deviceBreakdown.map((device, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-purple-400">
                        {getDeviceIcon(device.device)}
                      </div>
                      <div>
                        <p className="text-white font-medium capitalize">{device.device}</p>
                        <p className="text-xs text-gray-400">{formatPercentage(device.percentage)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{device.count}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">No device data</div>
              )}
            </div>
          </div>
        </div>

        {/* Browser & Geographic Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Browser Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-400" />
              Browser Breakdown
            </h3>
            <div className="space-y-3">
              {analytics.browserBreakdown.length > 0 ? (
                analytics.browserBreakdown.map((browser, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 font-medium">{browser.browser}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold">{browser.count}</span>
                        <span className="text-gray-400">{formatPercentage(browser.percentage)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${browser.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">No browser data</div>
              )}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-400" />
              Geographic Distribution
            </h3>
            <div className="space-y-3">
              {analytics.geographicDistribution.length > 0 ? (
                analytics.geographicDistribution.map((location, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-900/30 p-2 rounded-lg">
                        <MapPin className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{location.country}</p>
                        <p className="text-xs text-gray-400">{location.city}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{location.count}</p>
                      <p className="text-xs text-gray-400">{formatPercentage(location.percentage)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">No geographic data</div>
              )}
            </div>
          </div>
        </div>

        {/* Conversion Tracking */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-emerald-400" />
            Conversion Tracking
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <p className="text-sm text-gray-400 mb-2">Form Submissions</p>
              <p className="text-3xl font-bold text-white">{analytics.conversions.formSubmissions}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <p className="text-sm text-gray-400 mb-2">Button Clicks</p>
              <p className="text-3xl font-bold text-white">{analytics.conversions.buttonClicks}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <p className="text-sm text-gray-400 mb-2">Link Clicks</p>
              <p className="text-3xl font-bold text-white">{analytics.conversions.linkClicks}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-emerald-600">
              <p className="text-sm text-emerald-400 mb-2">Total Conversions</p>
              <p className="text-3xl font-bold text-emerald-400">{analytics.conversions.totalConversions}</p>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Top Pages
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 text-sm font-medium text-gray-400">Page</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Views</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {analytics.topPages.length > 0 ? (
                  analytics.topPages.map((page, index) => (
                    <tr key={index} className="hover:bg-gray-700/50 transition">
                      <td className="py-4 text-white">{page.page || '/'}</td>
                      <td className="py-4 text-white font-bold text-right">{formatNumber(page.views)}</td>
                      <td className="py-4 text-gray-300 text-right">{formatTime(page.avgTime)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      No page data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
