'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Convert React/JSX code to previewable HTML
const convertToPreviewableHTML = (code: string): string => {
  // Check if it's already HTML (starts with <!DOCTYPE or <html or has proper HTML structure)
  if (code.trim().startsWith('<!DOCTYPE') || 
      code.trim().startsWith('<html') ||
      (code.includes('<head>') && code.includes('<body>'))) {
    return code
  }

  // Check if it's React/JSX code
  const isReactCode = 
    code.includes('export default function') ||
    code.includes('export default class') ||
    code.includes('import React') ||
    code.includes('import {') ||
    code.includes('useState') ||
    code.includes('useEffect') ||
    code.includes('className=') ||
    code.includes('=>') ||
    code.includes('const ') ||
    code.includes('```tsx') ||
    code.includes('```jsx')

  if (isReactCode) {
    // Extract JSX content and convert to HTML
    let html = code
    
    // Remove code blocks markers
    html = html.replace(/```tsx|```jsx|```html|```/g, '')
    
    // Remove imports
    html = html.replace(/import\s+.*?from\s+['"][^'"]+['"]\s*;?\n?/g, '')
    html = html.replace(/import\s+['"][^'"]+['"]\s*;?\n?/g, '')
    
    // Remove 'use client' directive
    html = html.replace(/['"]use client['"]\s*;?\n?/g, '')
    
    // Remove export statements and function declarations
    html = html.replace(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{?\s*\n?\s*return\s*\(?/g, '')
    html = html.replace(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/g, '')
    html = html.replace(/function\s+\w+\s*\([^)]*\)\s*\{?\s*\n?\s*return\s*\(?/g, '')
    
    // Remove const declarations for components
    html = html.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{?\s*\n?\s*return\s*\(?/g, '')
    html = html.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(?/g, '')
    
    // Remove closing braces and parentheses at the end
    html = html.replace(/\)?\s*;?\s*\}?\s*$/, '')
    
    // Convert className to class
    html = html.replace(/className=/g, 'class=')
    
    // Convert JSX expressions {variable} to empty (or placeholder)
    html = html.replace(/\{[^{}]*\}/g, (match) => {
      // Keep simple text content
      if (match.match(/^\{['"`][^'"`]+['"`]\}$/)) {
        return match.slice(2, -2) // Remove {" and "}
      }
      // Keep emoji and simple strings
      if (match.match(/^\{['"`].*['"`]\}$/s)) {
        return match.slice(2, -2)
      }
      return ''
    })
    
    // Remove .map() constructs and replace with static content
    html = html.replace(/\{[\s\S]*?\.map\([\s\S]*?\)\}/g, '')
    
    // Clean up any remaining JSX artifacts
    html = html.replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // Remove JSX comments
    html = html.replace(/\{`[^`]*`\}/g, '') // Remove template literals
    
    // Wrap in basic HTML structure with Tailwind CSS
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${html.trim()}
</body>
</html>`
  }

  // If it's partial HTML without full structure, wrap it
  if (!code.includes('<html') && !code.includes('<!DOCTYPE')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`
  }

  return code
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

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

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (project?.code) {
      navigator.clipboard.writeText(project.code)
      alert('Code copied to clipboard!')
    }
  }

  // Download as HTML file
  const handleDownloadHTML = () => {
    if (!project?.code) return
    const blob = new Blob([convertToPreviewableHTML(project.code)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name || 'project'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download as ZIP
  const handleDownloadZIP = async () => {
    if (!project?.code) return
    setExporting(true)
    try {
      // Create a simple structure for download
      const htmlContent = convertToPreviewableHTML(project.code)
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name || 'project'}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // Export to GitHub
  const handleExportGitHub = async () => {
    if (!project?.code) return
    setExporting(true)
    try {
      const res = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          name: project.name,
          code: project.code
        })
      })
      
      const data = await res.json()
      if (res.ok && data.url) {
        window.open(data.url, '_blank')
        alert('Repository created successfully!')
      } else {
        alert(data.error || 'Failed to create GitHub repository')
      }
    } catch (error) {
      console.error('GitHub export error:', error)
      alert('Failed to export to GitHub')
    } finally {
      setExporting(false)
    }
  }

  // Navigate to edit
  const handleEdit = () => {
    router.push(`/builder?project=${projectId}`)
  }

  // Navigate back to dashboard
  const handleBack = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!project || !project.code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">No code to preview</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Preview Header with Action Menu */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <div className="h-6 w-px bg-gray-700"></div>
            <div>
              <h1 className="text-lg font-bold text-white">{project.name}</h1>
              <p className="text-xs text-gray-400">Preview Mode</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-lg text-xs font-medium mr-2">
              🟢 Live Preview
            </span>
            
            {/* Copy Button */}
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm flex items-center gap-2"
              title="Copy Code"
            >
              📋 Copy
            </button>
            
            {/* Download Button */}
            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm flex items-center gap-2"
              title="Download HTML"
            >
              💾 Download
            </button>
            
            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm flex items-center gap-2"
                disabled={exporting}
              >
                {exporting ? '⏳ Exporting...' : '📦 Export ▼'}
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  <div className="py-1">
                    <button
                      onClick={() => { handleDownloadZIP(); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                    >
                      <span className="text-xl">📁</span>
                      <div>
                        <div className="font-medium">Download ZIP</div>
                        <div className="text-xs text-gray-400">Save as HTML file</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { handleExportGitHub(); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                    >
                      <span className="text-xl">🐙</span>
                      <div>
                        <div className="font-medium">Push to GitHub</div>
                        <div className="text-xs text-gray-400">Create new repository</div>
                      </div>
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => { handleCopyCode(); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                    >
                      <span className="text-xl">📋</span>
                      <div>
                        <div className="font-medium">Copy Code</div>
                        <div className="text-xs text-gray-400">Copy to clipboard</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Edit Button */}
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-2"
            >
              ✏️ Edit Project
            </button>
          </div>
        </div>
      </header>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Preview Frame - Takes remaining height */}
      <div className="flex-1 w-full overflow-auto bg-white">
        <iframe
          srcDoc={convertToPreviewableHTML(project.code)}
          className="w-full h-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style={{ backgroundColor: 'white', minHeight: '100%' }}
        />
      </div>
    </div>
  )
}