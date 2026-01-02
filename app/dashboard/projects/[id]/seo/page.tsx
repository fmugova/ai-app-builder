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
  seoKeywords?: string
  ogImage?: string
  published: boolean
}

interface SEOScore {
  score: number
  issues: string[]
  suggestions: string[]
}

export default function SEOManagerPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const projectId = params.id as string
  
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchPages()
    }
  }, [status, projectId, router])

  useEffect(() => {
    if (selectedPage) {
      calculateSEOScore(selectedPage)
    }
  }, [selectedPage])

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/pages?projectId=${projectId}`)
      const data = await response.json()
      setPages(data.pages || [])
      if (data.pages?.length > 0) {
        setSelectedPage(data.pages[0])
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateSEOScore = (page: Page) => {
    let score = 100
    const issues: string[] = []
    const suggestions: string[] = []

    // Title checks
    if (!page.title || page.title.length === 0) {
      score -= 20
      issues.push('Missing page title')
      suggestions.push('Add a descriptive page title (50-60 characters)')
    } else if (page.title.length > 60) {
      score -= 10
      issues.push('Title too long')
      suggestions.push('Shorten title to under 60 characters')
    } else if (page.title.length < 30) {
      score -= 5
      issues.push('Title too short')
      suggestions.push('Expand title to at least 30 characters')
    }

    // Description checks
    if (!page.description || page.description.length === 0) {
      score -= 20
      issues.push('Missing meta description')
      suggestions.push('Add a meta description (120-160 characters)')
    } else if (page.description.length > 160) {
      score -= 10
      issues.push('Description too long')
      suggestions.push('Shorten description to under 160 characters')
    } else if (page.description.length < 120) {
      score -= 5
      issues.push('Description too short')
      suggestions.push('Expand description to at least 120 characters')
    }

    // Keywords check
    if (!page.seoKeywords || page.seoKeywords.length === 0) {
      score -= 10
      issues.push('No SEO keywords')
      suggestions.push('Add 3-5 relevant keywords')
    }

    // OG Image check
    if (!page.ogImage) {
      score -= 10
      issues.push('No Open Graph image')
      suggestions.push('Add an image for social media sharing (1200x630px)')
    }

    // URL/Slug check
    if (page.slug.length > 50) {
      score -= 5
      issues.push('URL slug too long')
      suggestions.push('Shorten URL slug to under 50 characters')
    }

    setSeoScore({
      score: Math.max(0, score),
      issues,
      suggestions
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Good'
    if (score >= 60) return 'Needs Improvement'
    return 'Poor'
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
            <h1 className="text-2xl font-bold text-gray-900">SEO Manager</h1>
            <p className="text-sm text-gray-600 mt-1">
              Optimize your pages for search engines
            </p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}`)}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Back to Project Overview
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {pages.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No pages yet</p>
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}/pages`)}
              className="mt-4 text-purple-600 hover:text-purple-700"
            >
              Create your first page →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Page Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-24">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900">Select Page</h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {pages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className={`w-full p-4 text-left hover:bg-gray-50 ${
                        selectedPage?.id === page.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{page.name}</div>
                      <div className="text-sm text-gray-500">/{page.slug}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SEO Analysis */}
            {selectedPage && seoScore && (
              <div className="lg:col-span-2 space-y-6">
                {/* Score Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">SEO Score</h3>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(seoScore.score)}`}>
                        {seoScore.score}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {getScoreLabel(seoScore.score)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            seoScore.score >= 80
                              ? 'bg-green-500'
                              : seoScore.score >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${seoScore.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {seoScore.issues.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Issues ({seoScore.issues.length})
                    </h3>
                    <ul className="space-y-2">
                      {seoScore.issues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                          <span className="text-red-500">✕</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {seoScore.suggestions.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Suggestions ({seoScore.suggestions.length})
                    </h3>
                    <ul className="space-y-2">
                      {seoScore.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-blue-700">
                          <span className="text-blue-500">💡</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Current SEO Data */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Current SEO Data</h3>
                    <button
                      onClick={() => router.push(`/dashboard/projects/${projectId}/pages/${selectedPage.id}/edit`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      Edit Page
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title ({selectedPage.title?.length || 0}/60)
                      </label>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        {selectedPage.title || <span className="text-gray-400">Not set</span>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description ({selectedPage.description?.length || 0}/160)
                      </label>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        {selectedPage.description || <span className="text-gray-400">Not set</span>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Keywords
                      </label>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        {selectedPage.seoKeywords || <span className="text-gray-400">Not set</span>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL
                      </label>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 font-mono text-sm">
                        /{selectedPage.slug}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OG Image
                      </label>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        {selectedPage.ogImage ? (
                          <a href={selectedPage.ogImage} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm">
                            {selectedPage.ogImage}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}