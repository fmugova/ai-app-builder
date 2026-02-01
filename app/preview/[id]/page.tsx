// app/preview/[id]/page.tsx
// FIXED VERSION - Prevents hydration mismatch

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'

export default function PreviewPage() {
  const params = useParams()
  const id = params?.id as string
  
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${id}`)
        const data = await response.json()

        if (response.ok) {
          const code = data.code || data.html || data.htmlCode || ''
          if (code) {
            setHtml(code)
          } else {
            setError('No code found in this project')
          }
        } else {
          setError(data.error || 'Failed to load project')
        }
      } catch (err) {
        console.error('Preview error:', err)
        setError('Failed to load preview')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProject()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preview Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!html) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Preview Available</h2>
          <p className="text-gray-600">This project doesn't have any code yet</p>
        </div>
      </div>
    )
  }

  // ✅ FIX: Render HTML in iframe to avoid hydration issues
  return (
    <>
      <Toaster position="top-right" />
      <iframe
        srcDoc={html}
        className="w-full h-screen border-0"
        title="Project Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </>
  )
}
