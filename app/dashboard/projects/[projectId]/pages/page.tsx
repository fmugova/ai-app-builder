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
  order: number
  createdAt: string
}

export default function ProjectPagesPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const projectId = params.projectId as string
  
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [showPageBuilder, setShowPageBuilder] = useState(false)
  const [currentPage, setCurrentPage] = useState({
    name: '',
    slug: '',
    title: '',
    description: '',
    content: '',
    isHome: false
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchPages()
    }
  }, [status, projectId, router])

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/pages?projectId=${projectId}`)
      const data = await response.json()
      setPages(data.pages || [])
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const handleCreatePage = async () => {
    if (!currentPage.name) {
      setError('Page name is required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const slug = currentPage.slug || generateSlug(currentPage.name)
      
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: currentPage.name,
          slug,
          title: currentPage.title || currentPage.name,
          description: currentPage.description,
          content: currentPage.content || `<h1>${currentPage.name}</h1><p>Add your content here...</p>`,
          isHome: currentPage.isHome
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create page')
      }

      setShowPageBuilder(false)
      setCurrentPage({
        name: '',
        slug: '',
        title: '',
        description: '',
        content: '',
        isHome: false
      })
      fetchPages()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Delete this page? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete page')

      fetchPages()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
            <p className="text-sm text-gray-600 mt-1">
              {pages.length} page{pages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPageBuilder(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              + Add Page
            </button>
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {pages.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No pages yet</h3>
            <p className="text-gray-600 mb-6">
              Create pages to build a multi-page website
            </p>
            <button
              onClick={() => setShowPageBuilder(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Create Your First Page
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{page.name}</h3>
                      {page.isHome && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          Home
                        </span>
                      )}
                      {!page.published && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">/{page.slug}</p>
                    {page.description && (
                      <p className="text-sm text-gray-500 mt-2">{page.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/projects/${projectId}/pages/${page.id}/edit`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page Builder Modal */}
      {showPageBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Page</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Name *
                </label>
                <input
                  type="text"
                  value={currentPage.name}
                  onChange={(e) => {
                    setCurrentPage({
                      ...currentPage,
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    })
                  }}
                  placeholder="About Us"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">/</span>
                  <input
                    type="text"
                    value={currentPage.slug}
                    onChange={(e) => setCurrentPage({
                      ...currentPage,
                      slug: generateSlug(e.target.value)
                    })}
                    placeholder="about-us"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Title (SEO)
                </label>
                <input
                  type="text"
                  value={currentPage.title}
                  onChange={(e) => setCurrentPage({...currentPage, title: e.target.value})}
                  placeholder="About Us - Company Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={currentPage.description}
                  onChange={(e) => setCurrentPage({...currentPage, description: e.target.value})}
                  placeholder="Brief description for search engines..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHome"
                  checked={currentPage.isHome}
                  onChange={(e) => setCurrentPage({...currentPage, isHome: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="isHome" className="text-sm text-gray-700">
                  Set as home page
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPageBuilder(false)
                  setError(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePage}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}