'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  code: string
  type: string | null
  isPublished: boolean
  publicUrl: string | null
  views: number
  createdAt: string
  updatedAt: string
}

interface User {
  name: string
  email: string
  isAdmin: boolean
}

interface Activity {
  id: string
  type: string
  action: string
  createdAt: string
  metadata: any
}

interface Analytics {
  totalViews: number
  recentActivity: Activity[]
}

interface ProjectOverviewClientProps {
  project: Project
  user: User
  analytics: Analytics
}

// Native JavaScript date formatting functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
}

export default function ProjectOverviewClient({ 
  project, 
  user, 
  analytics 
}: ProjectOverviewClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/dashboard?deleted=true')
      } else {
        alert('Failed to delete project')
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete project')
      setIsDeleting(false)
    }
  }

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to publish project')
      }
    } catch (error) {
      console.error('Publish error:', error)
      alert('Failed to publish project')
    }
  }

  const handleUnpublish = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to unpublish project')
      }
    } catch (error) {
      console.error('Unpublish error:', error)
      alert('Failed to unpublish project')
    }
  }

  const copyPublicUrl = () => {
    if (project.publicUrl) {
      navigator.clipboard.writeText(project.publicUrl)
      alert('URL copied to clipboard!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="text-gray-400 hover:text-white transition"
              >
                ← Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-700" />
              <h1 className="text-xl font-bold text-white">Project Overview</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/chatbuilder?projectId=${project.id}`}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium"
              >
                ✏️ Edit in Builder
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Project Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold text-white">{project.name}</h2>
                {project.isPublished && (
                  <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-medium border border-green-700">
                    ✓ Published
                  </span>
                )}
                {!project.isPublished && (
                  <span className="px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-sm font-medium border border-gray-600">
                    Draft
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-gray-400 text-lg mb-4">{project.description}</p>
              )}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>Created {getRelativeTime(project.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>Updated {getRelativeTime(project.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>👁️</span>
                  <span>{analytics.totalViews} views</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              href={`/preview/${project.id}`}
              target="_blank"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-300 rounded-lg transition text-sm font-medium"
            >
              👁️ Preview
            </Link>
            
            {project.isPublished ? (
              <>
                <button
                  onClick={copyPublicUrl}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-300 rounded-lg transition text-sm font-medium"
                >
                  🔗 Copy URL
                </button>
                <button
                  onClick={handleUnpublish}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-800 text-yellow-300 rounded-lg transition text-sm font-medium"
                >
                  📥 Unpublish
                </button>
              </>
            ) : (
              <button
                onClick={handlePublish}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-300 rounded-lg transition text-sm font-medium"
              >
                🚀 Publish
              </button>
            )}
            
            <Link
              href={`/chatbuilder?projectId=${project.id}`}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800 text-purple-300 rounded-lg transition text-sm font-medium"
            >
              ✏️ Edit
            </Link>
            <Link
              href={`/dashboard/projects/${project.id}/submissions`}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-800 text-indigo-300 rounded-lg transition text-sm font-medium"
            >
              📨 Submissions
            </Link>
            
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 rounded-lg transition text-sm font-medium"
            >
              💻 Code
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`flex items-center justify-center gap-2 px-4 py-3 ${
                showDeleteConfirm 
                  ? 'bg-red-900/50 border-red-700 text-red-300' 
                  : 'bg-red-900/30 hover:bg-red-900/50 border-red-800 text-red-300'
              } border rounded-lg transition text-sm font-medium`}
            >
              {isDeleting ? '⏳' : showDeleteConfirm ? '⚠️ Confirm' : '🗑️'} Delete
            </button>
          </div>

          {/* Code Preview */}
          {showCode && (
            <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-sm font-medium text-gray-300">Project Code</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(project.code)
                    alert('Code copied to clipboard!')
                  }}
                  className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
                >
                  📋 Copy
                </button>
              </div>
              <pre className="p-4 text-sm text-gray-300 overflow-x-auto max-h-96">
                <code>{project.code}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👁️</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-white">{analytics.totalViews}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-lg font-bold text-white">{getRelativeTime(project.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🕐</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-lg font-bold text-white">{getRelativeTime(project.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href={`/dashboard/projects/${project.id}/pages`}
            className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-800 rounded-2xl p-6 hover:border-purple-700 transition group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Pages</h3>
                <p className="text-sm text-gray-400">Manage pages</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/navigation`}
            className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-800 rounded-2xl p-6 hover:border-blue-700 transition group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">🧭</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Navigation</h3>
                <p className="text-sm text-gray-400">Design nav</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/seo`}
            className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-800 rounded-2xl p-6 hover:border-green-700 transition group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="font-bold text-white">SEO</h3>
                <p className="text-sm text-gray-400">Optimize</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/settings`}
            className="bg-gradient-to-br from-gray-800 to-gray-700/20 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Settings</h3>
                <p className="text-sm text-gray-400">Configure</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Publishing Info */}
        {project.isPublished && project.publicUrl && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800 rounded-2xl p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-2xl">🌐</span>
                  Published Website
                </h3>
                <p className="text-gray-400 mb-4">Your project is live and accessible to the public</p>
                <div className="flex items-center gap-3">
                  <a
                    href={project.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 font-mono text-sm underline"
                  >
                    {project.publicUrl}
                  </a>
                  <button
                    onClick={copyPublicUrl}
                    className="px-3 py-1 bg-green-900/50 hover:bg-green-900/70 border border-green-700 text-green-300 rounded text-xs transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <button
                onClick={handleUnpublish}
                className="px-4 py-2 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-800 text-yellow-300 rounded-lg transition text-sm font-medium"
              >
                Unpublish
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {analytics.recentActivity.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Recent Activity
            </h3>
            <div className="space-y-3">
              {analytics.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-lg">
                        {activity.action === 'created' && '➕'}
                        {activity.action === 'updated' && '✏️'}
                        {activity.action === 'deleted' && '🗑️'}
                        {activity.action === 'published' && '🚀'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium capitalize">
                        {activity.type} {activity.action}
                      </p>
                      <p className="text-sm text-gray-400">
                        {getRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}