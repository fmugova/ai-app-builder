'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BarChart3, TrendingUp, Clock, ArrowLeft } from 'lucide-react'

export default function AnalyticsPage() {
  const { status } = useSession()
  const router = useRouter()
  type AnalyticsData = {
    totalProjects: number
    generationsUsed: number
    recentProjects?: {
      id: string
      name: string
      createdAt: string
    }[]
  }

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchAnalytics()
    }
  }, [status, router])

  async function fetchAnalytics() {
    try {
      const response = await fetch('/api/analytics')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your usage and activity</p>
          </div>
        </div>

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Total Projects</h3>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-5xl font-bold text-blue-600 mb-2">
                  {data.totalProjects}
                </p>
                <p className="text-sm text-gray-500">Projects created</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Generations Used</h3>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-5xl font-bold text-green-600 mb-2">
                  {data.generationsUsed}
                </p>
                <p className="text-sm text-gray-500">In the last 30 days</p>
              </div>
            </div>

            {data.recentProjects && data.recentProjects.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
                </div>
                <div className="space-y-3">
                  {data.recentProjects.map((project: { id: string; name: string; createdAt: string }) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/builder?project=${project.id}`}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
