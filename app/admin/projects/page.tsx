'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  User: {
    name: string | null
    email: string
  }
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // Check admin status via API
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        setIsAdmin(false)
      }
    }
    if (session?.user?.email) {
      checkAdmin()
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (status === 'loading' || isAdmin === null) return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!isAdmin) {
      router.push('/dashboard')
      return
    }

    loadProjects()
  }, [session, status, isAdmin])

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/admin/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.User.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">All Projects</h1>
              <p className="text-gray-400">Total of {projects.length} projects across all users</p>
            </div>
            <Link
              href="/admin"
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by project name, user email, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition"
              >
                {/* Project Icon */}
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">📱</span>
                </div>

                {/* Project Info */}
                <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                )}

                {/* User Info */}
                <div className="mb-4 pb-4 border-b border-gray-800">
                  <p className="text-xs text-gray-500">Created by</p>
                  <p className="text-sm text-gray-300">{project.User.name || 'Anonymous'}</p>
                  <p className="text-xs text-gray-500">{project.User.email}</p>
                </div>

                {/* Dates */}
                <div className="text-xs text-gray-500 mb-4">
                  <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/preview/${project.id}`}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-center text-sm"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => window.open(`/builder?project=${project.id}`, '_blank')}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📭</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-400">
              {searchQuery ? 'Try adjusting your search query' : 'Projects will appear here as users create them'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
