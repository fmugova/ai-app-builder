'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  code: string
  published: boolean
  publishedUrl: string | null
  deployedUrl: string | null
  githubUrl: string | null
  createdAt: string
  updatedAt: string
}

interface ProjectOverviewClientProps {
  project: Project
}

export default function ProjectOverviewClient({ project }: ProjectOverviewClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST'
      })

      if (res.ok) {
        alert('✅ Project published successfully!')
        router.refresh()
      } else {
        const error = await res.json()
        alert(`❌ Failed to publish: ${error.error}`)
      }
    } catch {
      alert('❌ Failed to publish project')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"?\n\nThis action cannot be undone!`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Project deleted successfully!')
        router.push('/dashboard')
      } else {
        const error = await res.json()
        alert(`❌ Failed to delete: ${error.error}`)
      }
    } catch {
      alert('❌ Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {project.description}
                </p>
              )}
            </div>
            <Link
              href="/dashboard"
              className="ml-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              project.published 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
              {project.published ? '🟢 Published' : '🟡 Draft'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href={`/chatbuilder/${project.id}`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Chat Builder</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Build with AI</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/pages`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Pages</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage pages</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/navigation`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🧭</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Navigation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Build menu</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/seo`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">SEO</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Optimize SEO</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/analytics`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">View insights</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/submissions`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">📬</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Submissions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Form data</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/domains`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Custom Domains</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Add domains</p>
          </Link>

          <Link
            href={`/dashboard/projects/${project.id}/env-vars`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Environment Variables</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Secure config</p>
          </Link>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl p-6 hover:shadow-lg transition text-left"
          >
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold mb-1">
              {isPublishing ? 'Publishing...' : 'Publish'}
            </h3>
            <p className="text-sm text-green-100">Make it live</p>
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl p-6 hover:shadow-lg transition text-left"
          >
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="font-semibold mb-1">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </h3>
            <p className="text-sm text-red-100">Remove project</p>
          </button>
        </div>

        {/* URLs Section */}
        {(project.publishedUrl || project.deployedUrl || project.githubUrl) && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Links</h2>
            <div className="space-y-3">
              {project.publishedUrl && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Published Site</label>
                  <a
                    href={project.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition truncate"
                  >
                    {project.publishedUrl} →
                  </a>
                </div>
              )}
              {project.deployedUrl && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Vercel Deployment</label>
                  <a
                    href={project.deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition truncate"
                  >
                    {project.deployedUrl} →
                  </a>
                </div>
              )}
              {project.githubUrl && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">GitHub Repository</label>
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition truncate"
                  >
                    {project.githubUrl} →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Info */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Project Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Project ID</dt>
              <dd className="font-mono text-sm text-gray-900 dark:text-white mt-1">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">
                {project.published ? 'Published' : 'Draft'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">
                {new Date(project.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Last Updated</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">
                {new Date(project.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}