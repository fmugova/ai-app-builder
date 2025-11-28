'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PreviewProject() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    loadProject()
  }, [])

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      const data = await res.json()
      setProject(data)
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('Link copied!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ✅ IMPROVED SANITIZATION
  const sanitizeCode = (code: string): string => {
    return code
      // Remove all "Back to Dashboard" text variations
      .replace(/Back\s+to\s+Dashboard/gi, '')
      .replace(/Go\s+to\s+Dashboard/gi, '')
      .replace(/Return\s+to\s+Dashboard/gi, '')
      
      // Remove all dashboard links (multiple patterns)
      .replace(/<a[^>]*href=["'][^"']*\/dashboard[^"']*["'][^>]*>.*?<\/a>/gis, '')
      .replace(/<button[^>]*onclick=["'][^"']*dashboard[^"']*["'][^>]*>.*?<\/button>/gis, '')
      
      // Remove navigation buttons completely
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?back[^<]*<\/header>/gi, '')
      
      // Fix remaining href attributes
      .replace(/href=["']\/dashboard["']/gi, 'href="#"')
      .replace(/href=["']\/builder["']/gi, 'href="#"')
      .replace(/href=["']\/auth[^"']*["']/gi, 'href="#"')
      
      // Remove onclick handlers
      .replace(/onclick=["'][^"']*router[^"']*["']/gi, '')
      .replace(/onclick=["'][^"']*dashboard[^"']*["']/gi, '')
  }

  const cleanCode = sanitizeCode(project.code)

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* ✅ SINGLE, CLEAN HEADER */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              window.close()
              setTimeout(() => router.push('/dashboard'), 100)
            }}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition"
          >
            ← Close Preview
          </button>
          <div className="h-6 w-px bg-gray-700"></div>
          <h1 className="text-white font-semibold">{project.name}</h1>
          <span className="text-gray-500 text-sm">•</span>
          <span className="text-gray-400 text-sm capitalize">{project.type}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-green-900/30 text-green-400 px-3 py-1.5 rounded-lg text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span>Secure Preview</span>
          </div>

          <button
            onClick={() => setShowCode(!showCode)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm transition"
          >
            {showCode ? '👁️ View' : '📝 Code'}
          </button>

          <button
            onClick={copyLink}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm transition"
          >
            🔗 Copy Link
          </button>
        </div>
      </div>

      {/* ✅ PREVIEW OR CODE VIEW */}
      <div className="flex-1 overflow-hidden">
        {showCode ? (
          // Code view
          <div className="h-full bg-gray-900 p-6 overflow-auto">
            <pre className="text-sm text-green-400 font-mono">
              <code>{project.code}</code>
            </pre>
          </div>
        ) : (
          // Preview iframe
          <iframe
            srcDoc={cleanCode}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title={project.name}
          />
        )}
      </div>
    </div>
  )
}