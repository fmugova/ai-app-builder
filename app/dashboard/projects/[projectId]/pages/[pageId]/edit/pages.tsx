'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Page {
  id: string
  name: string
  slug: string
  title?: string
  description?: string
  content: string
  isHome: boolean
  published: boolean
  seoTitle?: string
  seoKeywords?: string
  ogImage?: string
  createdAt?: string
}

export default function PageEditorPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const projectId = params.projectId as string
  const pageId = params.pageId as string
  
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'settings'>('content')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchPage()
    }
  }, [status, pageId, router])

  const fetchPage = async () => {
    try {
      const response = await fetch(`/api/pages/${pageId}`)
      const data = await response.json()
      setPage(data.page)
    } catch (err) {
      console.error('Failed to fetch page:', err)
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!page) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save page')
      }

      setSuccess('Page saved successfully!')
      setTimeout(() => setSuccess(null), 3000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!page) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...page, published: true })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish page')
      }

      setPage({ ...page, published: true })
      setSuccess('Page published successfully!')
      setTimeout(() => setSuccess(null), 3000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Page not found</p>
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}/pages`)}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            ← Back to Pages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/dashboard/projects/${projectId}/pages`)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{page.name}</h1>
                <p className="text-sm text-gray-600">/{page.slug}</p>
              </div>
              {!page.published && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  Draft
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              {!page.published && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Publish
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('content')}
              className={`pb-3 px-1 font-medium ${
                activeTab === 'content'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`pb-3 px-1 font-medium ${
                activeTab === 'seo'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              SEO
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-1 font-medium ${
                activeTab === 'settings'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
            {success}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {/* Editor */}
          <div className="space-y-6">
            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Page Content</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Name
                    </label>
                    <input
                      type="text"
                      value={page.name}
                      onChange={(e) => setPage({ ...page, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTML Content
                    </label>
                    <textarea
                      value={page.content}
                      onChange={(e) => setPage({ ...page, content: e.target.value })}
                      rows={20}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="<h1>Your content here...</h1>"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Use HTML to format your content. You can include inline styles or Tailwind classes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">SEO Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Title
                    </label>
                    <input
                      type="text"
                      value={page.title || ''}
                      onChange={(e) => setPage({ ...page, title: e.target.value })}
                      placeholder="Page Title - Site Name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(page.title || '').length}/60 characters (recommended)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Description
                    </label>
                    <textarea
                      value={page.description || ''}
                      onChange={(e) => setPage({ ...page, description: e.target.value })}
                      rows={3}
                      placeholder="Brief description for search engines..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(page.description || '').length}/160 characters (recommended)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SEO Keywords
                    </label>
                    <input
                      type="text"
                      value={page.seoKeywords || ''}
                      onChange={(e) => setPage({ ...page, seoKeywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Comma-separated keywords
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Open Graph Image URL
                    </label>
                    <input
                      type="text"
                      value={page.ogImage || ''}
                      onChange={(e) => setPage({ ...page, ogImage: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Image for social media sharing (1200x630px recommended)
                    </p>
                  </div>

                  {/* SEO Preview */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-3">Search Preview:</p>
                    <div className="bg-white p-4 rounded border border-gray-200">
                      <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                        {page.title || page.name}
                      </div>
                      <div className="text-green-700 text-sm mt-1">
                        https://yoursite.com/{page.slug}
                      </div>
                      <div className="text-gray-600 text-sm mt-2">
                        {page.description || 'No description provided'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Page Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Slug
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">/</span>
                      <input
                        type="text"
                        value={page.slug}
                        onChange={(e) => setPage({ 
                          ...page, 
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                        })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Lowercase letters, numbers, and hyphens only
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="isHome"
                      checked={page.isHome}
                      onChange={(e) => setPage({ ...page, isHome: e.target.checked })}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="isHome" className="block text-sm font-medium text-gray-700">
                        Set as Home Page
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        This page will be displayed when visitors access your site's root URL
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="published"
                      checked={page.published}
                      onChange={(e) => setPage({ ...page, published: e.target.checked })}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="published" className="block text-sm font-medium text-gray-700">
                        Published
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Make this page visible to visitors
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(page.createdAt || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24 h-[calc(100vh-8rem)] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg overflow-hidden h-[calc(100%-4rem)]">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>${page.title || page.name}</title>
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>
                        body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
                      </style>
                    </head>
                    <body>
                      ${page.content}
                    </body>
                    </html>
                  `}
                  className="w-full h-full"
                  sandbox="allow-scripts"
                  title="Page Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}