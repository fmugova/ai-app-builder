'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Monitor, Tablet, Smartphone, RefreshCw, Code, Download, Copy, Trash2, Edit, X, Menu } from 'lucide-react'

interface Project {
  id: string
  name: string
  code: string | null
  userId: string
}

interface PreviewClientProps {
  projectId: string
}

export default function PreviewClient({ projectId }: PreviewClientProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showCode, setShowCode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Enhanced sanitize with React support
  function sanitizeForPreview(code: string): string {
    let sanitized = code || ''

    // If already complete HTML, add base target
    if (sanitized.includes('<head>')) {
      if (!sanitized.includes('<base')) {
        sanitized = sanitized.replace('<head>', '<head>\n  <base target="_blank">')
      }
      return sanitized
    }

    // Detect React/JSX code
    const isReactCode = 
      sanitized.includes('export default function') ||
      sanitized.includes('useState') ||
      sanitized.includes('useEffect') ||
      sanitized.includes('className=') ||
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(/i.test(sanitized)

    if (isReactCode) {
      let reactCode = sanitized.replace(/```(?:tsx|jsx|javascript|js)?\n?/g, '')
      
      // Extract JSX from component
      const componentMatch = reactCode.match(/export\s+default\s+function\s+\w+[\s\S]*?\{[\s\S]*?return\s*\([\s\S]*?\)\s*\}/s)
      if (componentMatch) {
        const returnMatch = componentMatch[0].match(/return\s*\([\s\S]*?\)(?=\s*\})/s)
        if (returnMatch) {
          reactCode = returnMatch[0].replace(/^return\s*\(/, '').replace(/\)$/, '')
        }
      }
      
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef } = React;
    
    function App() {
      return (
        ${reactCode}
      );
    }
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`
    }

    // Regular HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }</style>
</head>
<body>
  ${sanitized.trim()}
</body>
</html>`
  }

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
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else if (!res.ok) {
        setError('Failed to load project')
      } else {
        setProject(data)
      }
    } catch (err) {
      console.error('Error loading project:', err)
      setError('Failed to load project')
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-red-900 border border-red-600 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-200 mb-2">Preview Error</h2>
          <p className="text-red-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">No project found</div>
      </div>
    )
  }

  // Validate the code before rendering
  const codeToRender = project.code || '<div>No code generated</div>'
  
  // Check for syntax errors
  if (codeToRender.includes('.map((') && !codeToRender.includes('.map(()')) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-yellow-200 mb-2">⚠️ Code Syntax Error</h2>
          <p className="text-yellow-300 mb-4">
            The generated code has syntax errors. Please regenerate this project.
          </p>
          <pre className="bg-black p-4 rounded overflow-auto text-sm text-gray-300">
            {codeToRender.substring(0, 500)}...
          </pre>
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