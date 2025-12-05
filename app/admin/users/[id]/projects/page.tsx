'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

const ADMIN_EMAILS = ['fmugova@yahoo.com', 'admin@buildflow.app']

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

interface User {
  name: string | null
  email: string
  subscriptionTier: string
}

export default function UserProjectsPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const userId = params.id as string
  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !isAdmin) {
      router.push('/dashboard')
      return
    }

    loadUserProjects()
  }, [session, status, isAdmin, userId])

  const loadUserProjects = async () => {
    try {
      // Get user details
      const userRes = await fetch(`/api/admin/users/${userId}/details`)
      if (userRes.ok) {
        setUser(await userRes.json())
      }

      // Get user's projects
      const projectsRes = await fetch(`/api/admin/users/${userId}/projects`)
      if (projectsRes.ok) {
        setProjects(await projectsRes.json())
      }
    } catch (error) {
      console.error('Failed to load user projects:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-400 hover:text-white transition"
              >
                ← Back to Admin
              </button>
              <div className="h-6 w-px bg-gray-700"></div>
              <div>
                <h1 className="text-2xl font-bold text-white">User Projects</h1>
                {user && (
                  <p className="text-sm text-gray-400">
                    {user.name || 'N/A'} ({user.email}) - {user.subscriptionTier}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📊</span>
              <div>
                <p className="text-sm text-gray-400">Total Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">⏱️</span>
              <div>
                <p className="text-sm text-gray-400">Latest Project</p>
                <p className="text-sm font-bold">
                  {projects.length > 0
                    ? new Date(projects[0].createdAt).toLocaleDateString()
                    : 'None'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">👤</span>
              <div>
                <p className="text-sm text-gray-400">Subscription</p>
                <p className="text-sm font-bold capitalize">{user?.subscriptionTier}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-6">All Projects</h2>

          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-400 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Created: {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>
                          Updated: {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => window.open(`/projects/${project.id}`, '_blank')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => window.open(`/builder?project=${project.id}`, '_blank')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                      >
                        Open in Editor
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-gray-400">This user hasn't created any projects yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}