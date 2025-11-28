'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is admin
    if (session?.user?.email !== 'admin@buildflow.app') {
      router.push('/dashboard')
      return
    }

    loadStats()
  }, [session])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (session?.user?.email !== 'admin@buildflow.app') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-red-600 p-2 rounded-lg">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-400">Admin Dashboard</h1>
                <p className="text-sm text-gray-400">System Control Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-green-900/30 text-green-400 px-4 py-2 rounded-lg">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">System Online</span>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Total Users', 
              value: stats?.totalUsers || 0, 
              icon: '👥', 
              color: 'from-blue-500 to-cyan-500',
              change: '+12%'
            },
            { 
              label: 'Total Projects', 
              value: stats?.totalProjects || 0, 
              icon: '📊', 
              color: 'from-purple-500 to-pink-500',
              change: '+23%'
            },
            { 
              label: 'AI Generations', 
              value: stats?.totalGenerations || 0, 
              icon: '✨', 
              color: 'from-green-500 to-emerald-500',
              change: '+8%'
            },
            { 
              label: 'Active Today', 
              value: stats?.activeUsers || 0, 
              icon: '⚡', 
              color: 'from-orange-500 to-red-500',
              change: '+2%'
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-400">{stat.label}</span>
                  <div className={`bg-gradient-to-r ${stat.color} p-2 rounded-xl`}>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <p className="text-4xl font-bold">{stat.value}</p>
                  <span className="text-green-400 text-sm font-semibold bg-green-900/30 px-2 py-1 rounded-lg">
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-xl font-bold mb-2">Users</h3>
            <p className="text-gray-400 text-sm mb-4">
              {stats?.totalUsers || 0} registered users
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition">
              Manage Users
            </button>
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-2">Projects</h3>
            <p className="text-gray-400 text-sm mb-4">
              {stats?.totalProjects || 0} total projects
            </p>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition">
              View All Projects
            </button>
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-xl font-bold mb-2">Feedback</h3>
            <p className="text-gray-400 text-sm mb-4">
              0 pending feedback
            </p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
              View Feedback
            </button>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-6">Recent Users</h3>
          <div className="space-y-3">
            {stats?.recentUsers?.slice(0, 5).map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-700 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}