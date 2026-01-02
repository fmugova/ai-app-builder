'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Page {
  id: string
  name: string
  slug: string
  order: number
  published: boolean
  isHome: boolean
}

export default function NavigationBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const projectId = params.id as string
  
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    const newPages = [...pages]
    const draggedPage = newPages[draggedIndex]
    
    newPages.splice(draggedIndex, 1)
    newPages.splice(index, 0, draggedPage)
    
    setPages(newPages)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    setSaving(true)

    try {
      // Update order for all pages
      const updates = pages.map((page, index) => ({
        id: page.id,
        order: index
      }))

      for (const update of updates) {
        await fetch(`/api/pages/${update.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: update.order })
        })
      }

    } catch (err) {
      console.error('Failed to update order:', err)
      fetchPages() // Revert on error
    } finally {
      setDraggedIndex(null)
      setSaving(false)
    }
  }

  const moveUp = async (index: number) => {
    if (index === 0) return

    const newPages = [...pages]
    const temp = newPages[index - 1]
    newPages[index - 1] = newPages[index]
    newPages[index] = temp

    setPages(newPages)
    await updateOrder(newPages)
  }

  const moveDown = async (index: number) => {
    if (index === pages.length - 1) return

    const newPages = [...pages]
    const temp = newPages[index + 1]
    newPages[index + 1] = newPages[index]
    newPages[index] = temp

    setPages(newPages)
    await updateOrder(newPages)
  }

  const updateOrder = async (orderedPages: Page[]) => {
    setSaving(true)

    try {
      const updates = orderedPages.map((page, index) => ({
        id: page.id,
        order: index
      }))

      for (const update of updates) {
        await fetch(`/api/pages/${update.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: update.order })
        })
      }
    } catch (err) {
      console.error('Failed to update order:', err)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Navigation Builder</h1>
            <p className="text-sm text-gray-600 mt-1">
              Organize your pages and set the navigation order
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

      <div className="max-w-4xl mx-auto px-6 py-8">
        {saving && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            Saving navigation order...
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              💡 Drag and drop to reorder pages, or use the arrow buttons
            </p>
          </div>

          {pages.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No pages yet</p>
              <button
                onClick={() => router.push(`/dashboard/projects/${projectId}/pages`)}
                className="mt-4 text-purple-600 hover:text-purple-700"
              >
                Create your first page →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 cursor-move ${
                    draggedIndex === index ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                      </svg>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{page.name}</span>
                        {page.isHome && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            Home
                          </span>
                        )}
                        {!page.published && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">/{page.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || saving}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === pages.length - 1 || saving}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Preview */}
        {pages.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Navigation Preview</h3>
            
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <nav className="flex gap-4">
                {pages.filter(p => p.published).map(page => (
                  <a
                    key={page.id}
                    href="#"
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      page.isHome
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page.name}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}