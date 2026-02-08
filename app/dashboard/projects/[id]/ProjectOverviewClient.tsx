'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PreviewFrameMultiPage from '@/components/PreviewFrameMultiPage'

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

interface Page {
  id: string
  slug: string
  title: string
  content: string
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
  isHomepage: boolean
  order: number
  isPublished: boolean
}

interface ProjectOverviewClientProps {
  project: Project
  pages?: Page[]
}

export default function ProjectOverviewClient({ project, pages = [] }: ProjectOverviewClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)

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

  const handleUnpublish = async () => {
    if (!confirm(`Unpublish "${project.name}"?\n\nYour app will no longer be publicly accessible.`)) {
      return
    }

    setIsUnpublishing(true)
    try {
      const res = await fetch('/api/deploy/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })

      if (res.ok) {
        alert('✅ Project unpublished successfully!')
        router.refresh()
      } else {
        const error = await res.json()
        alert(`❌ Failed to unpublish: ${error.error}`)
      }
    } catch {
      alert('❌ Failed to unpublish project')
    } finally {
      setIsUnpublishing(false)
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

          <Link
            href={`/dashboard/projects/${project.id}/endpoints`}
            className="bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-xl p-6 hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-1">API Endpoints</h3>
            <p className="text-sm text-purple-100">Backend logic</p>
          </Link>

          {!project.published && (
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
          )}

          {project.published && (
            <button
              onClick={handleUnpublish}
              disabled={isUnpublishing}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl p-6 hover:shadow-lg transition text-left"
            >
              <div className="text-3xl mb-3">📴</div>
              <h3 className="font-semibold mb-1">
                {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
              </h3>
              <p className="text-sm text-orange-100">Take offline</p>
            </button>
          )}

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

        {/* Backend Integration Guide */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">📚</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Backend Integration Guide</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your project includes powerful backend features. Here&#39;s how to use them:
              </p>

              <div className="space-y-4">
                {/* API Endpoints */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">⚡</span> API Endpoints
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Your project automatically gets RESTful API endpoints for data operations:
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-1">
                    <div><span className="text-green-600 dark:text-green-400">GET</span> /api/projects/{'{projectId}'}/data - Fetch all data</div>
                    <div><span className="text-blue-600 dark:text-blue-400">POST</span> /api/projects/{'{projectId}'}/data - Create new entry</div>
                    <div><span className="text-yellow-600 dark:text-yellow-400">PUT</span> /api/projects/{'{projectId}'}/data/{'{id}'} - Update entry</div>
                    <div><span className="text-red-600 dark:text-red-400">DELETE</span> /api/projects/{'{projectId}'}/data/{'{id}'} - Delete entry</div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Click <Link href={`/dashboard/projects/${project.id}/endpoints`} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">API Endpoints</Link> above to view full documentation
                  </p>
                </div>

                {/* Form Submissions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">📬</span> Form Submissions
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    All forms in your published site automatically save submissions to your database:
                  </p>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                    <li>Contact forms → Saved with email, name, message</li>
                    <li>Newsletter signups → Captured with timestamp</li>
                    <li>Custom forms → All fields stored in JSON format</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 View submissions in <Link href={`/dashboard/projects/${project.id}/submissions`} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">Submissions</Link>
                  </p>
                </div>

                {/* Environment Variables */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">🔐</span> Environment Variables
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Securely store API keys, database URLs, and secrets:
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-1">
                    <div>DATABASE_URL=your-database-connection-string</div>
                    <div>API_KEY=your-third-party-api-key</div>
                    <div>STRIPE_SECRET_KEY=sk_test_...</div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Manage in <Link href={`/dashboard/projects/${project.id}/env-vars`} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">Environment Variables</Link>
                  </p>
                </div>

                {/* Analytics */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">📊</span> Analytics & Monitoring
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Track your app&#39;s performance and user engagement:
                  </p>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                    <li>Page views and visitor counts</li>
                    <li>Form submission rates</li>
                    <li>API endpoint usage statistics</li>
                    <li>Error logs and debugging info</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 View insights in <Link href={`/dashboard/projects/${project.id}/analytics`} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">Analytics</Link>
                  </p>
                </div>

                {/* Quick Start */}
                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-300 dark:border-purple-700">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">🚀 Quick Start</h3>
                  <ol className="text-sm text-purple-800 dark:text-purple-300 space-y-1 list-decimal list-inside">
                    <li>Set up environment variables for any external services</li>
                    <li>Configure API endpoints for your data models</li>
                    <li>Test form submissions on your published site</li>
                    <li>Monitor analytics to track user engagement</li>
                    <li>Use custom domains to brand your application</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
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

        {/* Live Preview */}
        {pages.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Preview</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Multi-page application with {pages.length} page{pages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="h-[600px] bg-gray-50 dark:bg-gray-900">
              <PreviewFrameMultiPage pages={pages} />
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