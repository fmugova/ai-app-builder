// Sanitize and wrap preview HTML to ensure all links open in a new tab
function sanitizeForPreview(code: string): string {
  let sanitized = code || '';

  // If not a full HTML doc, wrap it
  if (!sanitized.includes('<html') && !sanitized.includes('<!DOCTYPE')) {
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <base target=\"_blank\">\n  <title>Preview</title>\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <style>body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }</style>\n</head>\n<body>\n  ${sanitized.trim()}\n</body>\n</html>`;
  }

  // If <head> exists, inject <base target="_blank">
  if (sanitized.includes('<head>')) {
    return sanitized.replace('<head>', '<head>\n  <base target="_blank">');
  }

  return sanitized;
}
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Monitor, Tablet, Smartphone, RefreshCw, Code, Download, Copy, Trash2, Edit, X, Menu } from 'lucide-react'

interface Project {
  id: string
  name: string
  code: string | null
  userId: string
}

export default function PreviewPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showCode, setShowCode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const projectId = params.id as string

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    loadProject()
  }, [session, status, projectId])

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      } else {
        alert('Project not found')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (project?.code) {
      navigator.clipboard.writeText(project.code)
      alert('Code copied to clipboard!')
    }
  }

  const handleDownload = () => {
    if (project?.code) {
      const blob = new Blob([project.code], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        alert('Project deleted')
        router.push('/dashboard')
      } else {
        alert('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleEdit = () => {
    router.push(`/builder?project=${projectId}`)
  }

  const handleClose = () => {
    router.push('/dashboard')
  }

  const getViewWidth = () => {
    switch (viewMode) {
      case 'mobile': return '375px'
      case 'tablet': return '768px'
      default: return '100%'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Project not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-white font-semibold text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
              {project.name}
            </h1>
          </div>

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'desktop' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('tablet')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'tablet' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'mobile' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-5 h-5" />
            </button>
            
            <div className="w-px h-6 bg-gray-700 mx-1"></div>

            <button
              onClick={handleEdit}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="Edit"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCode(!showCode)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="View Code"
            >
              <Code className="w-5 h-5" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="Copy Code"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-72 bg-gray-900 z-50 p-6 overflow-y-auto lg:hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <nav className="space-y-2">
              <p className="text-xs text-gray-400 uppercase mb-2">View</p>
              <button 
                onClick={() => { setViewMode('desktop'); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Monitor className="w-5 h-5" />
                <span>Desktop</span>
              </button>
              <button 
                onClick={() => { setViewMode('tablet'); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Tablet className="w-5 h-5" />
                <span>Tablet</span>
              </button>
              <button 
                onClick={() => { setViewMode('mobile'); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Smartphone className="w-5 h-5" />
                <span>Mobile</span>
              </button>

              <div className="my-4 border-t border-gray-700"></div>

              <p className="text-xs text-gray-400 uppercase mb-2">Actions</p>
              <button 
                onClick={() => { handleEdit(); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Edit className="w-5 h-5" />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => { setShowCode(!showCode); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Code className="w-5 h-5" />
                <span>View Code</span>
              </button>
              <button 
                onClick={() => { handleCopy(); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Copy className="w-5 h-5" />
                <span>Copy Code</span>
              </button>
              <button 
                onClick={() => { handleDownload(); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Download className="w-5 h-5" />
                <span>Download</span>
              </button>
              <button 
                onClick={() => { handleRefresh(); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Refresh</span>
              </button>

              <div className="my-4 border-t border-gray-700"></div>

              <button 
                onClick={() => { handleDelete(); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-red-400"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete Project</span>
              </button>
              <button 
                onClick={() => { handleClose(); setIsMobileMenuOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-gray-400"
              >
                <X className="w-5 h-5" />
                <span>Close</span>
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Pane */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {project.code ? (
            <div 
              className="bg-white rounded-lg shadow-2xl transition-all duration-300"
              style={{ 
                width: getViewWidth(),
                height: viewMode === 'mobile' ? '667px' : '100%',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <iframe
                srcDoc={sanitizeForPreview(project.code)}
                className="w-full h-full rounded-lg"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-4">No preview available</p>
              <button
                onClick={handleEdit}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Generate Code
              </button>
            </div>
          )}
        </div>

        {/* Code View */}
        {showCode && project.code && (
          <div className="w-full lg:w-1/2 bg-gray-900 border-l border-gray-800 overflow-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Code</h3>
              <button
                onClick={() => setShowCode(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>{project.code}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}