'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, LogOut, CreditCard, Plus, Loader2, Folder, Calendar, Code2 } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch subscription
      const subRes = await fetch('/api/user/subscription')
      if (subRes.ok) {
        const data = await subRes.json()
        setSubscription(data.subscription)
      }

      // Fetch projects
      const projRes = await fetch('/api/projects')
      if (projRes.ok) {
        const data = await projRes.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    window.location.href = '/api/auth/signout'
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return

    try {
      const res = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setProjects(projects.filter(p => p.id !== projectId))
      }
    } catch (error) {
      alert('Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    )
  }

  const generationsRemaining = subscription?.generationsLimit === -1 
    ? 'Unlimited' 
    : (subscription?.generationsLimit - subscription?.generationsUsed) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI App Builder
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back!</p>
                <p className="font-semibold text-gray-900">User</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Current Plan</h3>
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {subscription?.plan || 'Free'}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-semibold"
            >
              Upgrade Plan →
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Generations Used</h3>
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {subscription?.generationsUsed || 0} / {subscription?.generationsLimit === -1 ? '∞' : subscription?.generationsLimit || 3}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {generationsRemaining} remaining
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Projects</h3>
              <Folder className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {projects.length}
            </p>
            <button
              onClick={() => router.push('/builder')}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-semibold"
            >
              Create New →
            </button>
          </div>
        </div>

        {/* My Projects Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Folder className="w-6 h-6 mr-2 text-purple-600" />
              My Projects
            </h2>
            <button
              onClick={() => router.push('/builder')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6">Create your first AI-powered app!</p>
              <button
                onClick={() => router.push('/builder')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-purple-600 transition">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(project.createdAt).toLocaleDateString()}
                    <span className="mx-2">•</span>
                    <span className="capitalize">{project.type}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/builder?project=${project.id}`)}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center justify-center"
                    >
                      <Code2 className="w-4 h-4 mr-1" />
                      Open
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id)
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Warning */}
        {subscription && subscription.generationsUsed >= subscription.generationsLimit && subscription.generationsLimit !== -1 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-bold text-yellow-900 mb-2">Generation Limit Reached</h3>
            <p className="text-yellow-800 mb-4">
              You've used all your generations for this month. Upgrade to continue building!
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition"
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}