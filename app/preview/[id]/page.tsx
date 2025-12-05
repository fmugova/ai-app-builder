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
        window.close()
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
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
            onClick={() => window.close()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Preview Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.close()}
              className="text-gray-400 hover:text-white transition"
            >
              ← Close Preview
            </button>
            <div className="h-6 w-px bg-gray-700"></div>
            <div>
              <h1 className="text-lg font-bold text-white">{project.name}</h1>
              <p className="text-xs text-gray-400">Preview Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-lg text-xs font-medium">
              🟢 Secure Preview
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(project.code)
                alert('Code copied to clipboard!')
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
            >
              📋 Copy Code
            </button>
            <button
              onClick={() => {
                window.location.href = `/builder?project=${projectId}`
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium"
            >
              ✏️ Edit Project
            </button>
          </div>
        </div>
      </header>

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