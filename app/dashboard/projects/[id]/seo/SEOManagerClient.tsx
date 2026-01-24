'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Page {
  id: string
  title: string
  slug: string
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  isHomepage: boolean
}

interface SEOManagerClientProps {
  projectId: string
  initialPage: Page[]
}

export default function SEOManagerClient({ projectId, initialPage }: SEOManagerClientProps) {
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>(initialPage)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
  })

  const handleEditSEO = (page: Page) => {
    setSelectedPage(page)
    setFormData({
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      ogImage: page.ogImage || '',
    })
    setShowEditModal(true)
  }

  const handleSaveSEO = async () => {
    if (!selectedPage) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/pages/${selectedPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedPage,
          metaTitle: formData.metaTitle || null,
          metaDescription: formData.metaDescription || null,
          ogImage: formData.ogImage || null,
        }),
      })

      if (response.ok) {
        const updatedPage = await response.json()
        setPages(pages.map(p => p.id === updatedPage.id ? updatedPage : p))
        setShowEditModal(false)
        setSelectedPage(null)
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update SEO')
      }
    } catch (error) {
      console.error('Update SEO error:', error)
      alert('Failed to update SEO settings')
    } finally {
      setIsSaving(false)
    }
  }

  const getSEOScore = (page: Page): { score: number; color: string; label: string } => {
    let score = 0
    
    // Meta Title (40 points)
    if (page.metaTitle) {
      score += 40
      if (page.metaTitle.length >= 50 && page.metaTitle.length <= 60) score += 10
    }
    
    // Meta Description (40 points)
    if (page.metaDescription) {
      score += 40
      if (page.metaDescription.length >= 150 && page.metaDescription.length <= 160) score += 10
    }

    if (score >= 80) return { score, color: 'green', label: 'Excellent' }
    if (score >= 60) return { score, color: 'yellow', label: 'Good' }
    if (score >= 40) return { score, color: 'orange', label: 'Fair' }
    return { score, color: 'red', label: 'Needs Work' }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SEO Manager</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Optimize your pages for search engines</p>
            </div>
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition text-sm"
            >
              ← Back to Project Overview
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {pages.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No pages yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create pages to optimize their SEO
              </p>
              <Link
                href={`/dashboard/projects/${projectId}/pages`}
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
              >
                Create your first page →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                    SEO Best Practices
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Meta titles should be 50-60 characters</li>
                    <li>• Meta descriptions should be 150-160 characters</li>
                    <li>• Include target keywords naturally</li>
                    <li>• Make each page's SEO unique</li>
                      <li>• Make each page&apos;s SEO unique</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SEO Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map((page) => {
                const seoScore = getSEOScore(page)
                
                return (
                  <div
                    key={page.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                            {page.title}
                          </h3>
                          {page.isHomepage && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full font-medium">
                              Home
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          /{page.slug}
                        </p>
                      </div>
                    </div>

                    {/* SEO Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          SEO Score
                        </span>
                        <span className={`text-sm font-bold ${
                          seoScore.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          seoScore.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          seoScore.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {seoScore.score}/100 {seoScore.label}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            seoScore.color === 'green' ? 'bg-green-500' :
                            seoScore.color === 'yellow' ? 'bg-yellow-500' :
                            seoScore.color === 'orange' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${seoScore.score}%` }}
                        />
                      </div>
                    </div>

                    {/* SEO Status */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs">
                        {page.metaTitle ? (
                          <>
                            <span className="text-green-500">✓</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              Meta Title ({page.metaTitle.length} chars)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-500">✗</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              No Meta Title
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {page.metaDescription ? (
                          <>
                            <span className="text-green-500">✓</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              Meta Description ({page.metaDescription.length} chars)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-500">✗</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              No Meta Description
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleEditSEO(page)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                    >
                      🔍 Edit SEO Settings
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit SEO Modal */}
      {showEditModal && selectedPage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-b border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">SEO Settings</h2>
                  <p className="text-gray-300 text-sm mt-1">{selectedPage.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedPage(null)
                  }}
                  className="text-gray-400 hover:text-white transition text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meta Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder={`${selectedPage.title} - Your Site Name`}
                  maxLength={70}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Appears in search engine results and browser tabs
                  </p>
                  <span className={`text-xs font-medium ${
                    formData.metaTitle.length >= 50 && formData.metaTitle.length <= 60
                      ? 'text-green-600 dark:text-green-400'
                      : formData.metaTitle.length > 60
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formData.metaTitle.length}/60 chars
                  </span>
                </div>
              </div>

              {/* Meta Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  placeholder="Brief description of this page for search engines..."
                  rows={4}
                  maxLength={180}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Appears in search results below the title
                  </p>
                  <span className={`text-xs font-medium ${
                    formData.metaDescription.length >= 150 && formData.metaDescription.length <= 160
                      ? 'text-green-600 dark:text-green-400'
                      : formData.metaDescription.length > 160
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formData.metaDescription.length}/160 chars
                  </span>
                </div>
              </div>

              {/* OG Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Open Graph Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={formData.ogImage}
                  onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Image displayed when sharing on social media (1200x630px recommended)
                </p>
              </div>

              {/* Search Preview */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Search Preview
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    yoursite.com › {selectedPage.slug}
                  </div>
                  <div className="text-lg text-blue-600 dark:text-blue-400 font-medium mb-1 line-clamp-1">
                    {formData.metaTitle || selectedPage.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {formData.metaDescription || 'Add a meta description to see how it appears in search results.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedPage(null)
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSEO}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
              >
                {isSaving ? 'Saving...' : 'Save SEO Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}