'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Page {
  id: string
  title: string
  slug: string
  isHomepage: boolean
  order: number
}

interface NavigationBuilderClientProps {
  projectId: string
  initialPage: Page[]
}

export default function NavigationBuilderClient({ projectId, initialPage }: NavigationBuilderClientProps) {
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>(initialPage)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    const newPages = [...pages]
    const draggedPage = newPages[draggedIndex]
    
    // Remove from old position
    newPages.splice(draggedIndex, 1)
    
    // Insert at new position
    newPages.splice(index, 0, draggedPage)
    
    setPages(newPages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    
    const newPages = [...pages]
    const temp = newPages[index]
    newPages[index] = newPages[index - 1]
    newPages[index - 1] = temp
    
    setPages(newPages)
  }

  const moveDown = (index: number) => {
    if (index === pages.length - 1) return
    
    const newPages = [...pages]
    const temp = newPages[index]
    newPages[index] = newPages[index + 1]
    newPages[index + 1] = temp
    
    setPages(newPages)
  }

  const handleSaveOrder = async () => {
    setIsSaving(true)
    
    try {
      // Update order for each page
      const updates = pages.map((page, index) => ({
        id: page.id,
        order: index
      }))

      const response = await fetch(`/api/projects/${projectId}/pages/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: updates })
      })

      if (response.ok) {
        alert('✅ Navigation order saved!')
        router.refresh()
      } else {
        throw new Error('Failed to save order')
      }
    } catch (error) {
      console.error('Save order error:', error)
      alert('Failed to save navigation order')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Navigation Builder</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Organize your pages and set the navigation order</p>
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {pages.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🧭</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No pages yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create pages to build your navigation
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
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                    Drag and drop to reorder pages, or use the arrow buttons
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    The order here determines how pages appear in your site&apos;s navigation menu
                  </p>
                </div>
              </div>
            </div>

            {/* Pages List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Navigation Order ({pages.length} pages)
                  </h3>
                  <button
                    onClick={handleSaveOrder}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium text-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save Order'}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pages.map((page, index) => (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-6 flex items-center justify-between cursor-move hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-gray-400 dark:text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                            {page.title}
                          </h4>
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Move up"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === pages.length - 1}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Move down"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 flex items-center justify-between">
              <Link
                href={`/dashboard/projects/${projectId}/pages`}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium transition"
              >
                + Add new page
              </Link>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.refresh()}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition text-sm font-medium"
                >
                  Reset Order
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}