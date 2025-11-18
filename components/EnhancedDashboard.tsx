'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BarChart3, TrendingUp, Clock, ArrowLeft, Sparkles } from 'lucide-react'

export default function AnalyticsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white rounded-lg transition-colors shadow"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Track your usage and activity</p>
            </div>
          </div>
        </div>

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium text-lg">Total Projects</h3>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-5xl font-bold text-blue-600 mb-2">
                  {data.totalProjects}
                </p>
                <p className="text-sm text-gray-500">Projects created all time</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-green-100 hover:border-green-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium text-lg">Generations Used</h3>
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
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
                </div>
                <div className="space-y-3">
                  {data.recentProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/builder?project=${project.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors text-sm font-medium"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!data.recentProjects || data.recentProjects.length === 0) && (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
                <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-6">Start building to see your projects here</p>
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Project
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}