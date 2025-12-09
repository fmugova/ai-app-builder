'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import { templates } from '@/lib/templates'

// ✅ Sanitization and conversion function
const sanitizeForPreview = (code: string): string => {
  let sanitized = code
    // Remove dashboard text variations
    .replace(/Back\s+to\s+Dashboard/gi, '')
    .replace(/Go\s+to\s+Dashboard/gi, '')
    .replace(/Return\s+to\s+Dashboard/gi, '')
    .replace(/Dashboard/gi, 'Home')
    .replace(/Builder/gi, 'Editor')
    
    // Remove all dashboard links
    .replace(/<a\s+[^>]*href=["']\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']https?:\/\/[^"']*\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    
    // Remove builder links
    .replace(/<a\s+[^>]*href=["']\/builder["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/builder["'][^>]*>[\s\S]*?<\/a>/gi, '')
    
    // Remove auth and API links
    .replace(/<a\s+[^>]*href=["']\/auth[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/api[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    
    // Fix remaining href attributes
    .replace(/href=["']\/dashboard["']/gi, 'href="#"')
    .replace(/href=["']\/builder["']/gi, 'href="#"')
    .replace(/href=["']\/auth[^"']*["']/gi, 'href="#"')
    .replace(/href=["']\/api[^"']*["']/gi, 'href="#"')
    
    // Remove onclick handlers
    .replace(/onclick=["'][^"']*dashboard[^"']*["']/gi, 'onclick="return false"')
    .replace(/onclick=["'][^"']*builder[^"']*["']/gi, 'onclick="return false"')
    .replace(/onclick=["'][^"']*router\.push[^"']*["']/gi, 'onclick="return false"')
    
    // Remove router and Next.js code
    .replace(/import\s+{\s*useRouter\s*}\s+from\s+['"]next\/navigation['"]/gi, '')
    .replace(/import\s+{\s*Link\s*}\s+from\s+['"]next\/link['"]/gi, '')
    .replace(/const\s+router\s*=\s*useRouter\(\)/gi, '')
    .replace(/router\.push\([^)]*\)/gi, '')
    .replace(/router\.replace\([^)]*\)/gi, '')
    
    // Remove window.location redirects
    .replace(/window\.location\s*=\s*["'][^"']*\/dashboard[^"']*["']/gi, '')
    .replace(/window\.location\.href\s*=\s*["'][^"']*\/dashboard[^"']*["']/gi, '')
    .replace(/window\.location\s*=\s*["'][^"']*\/builder[^"']*["']/gi, '')
    .replace(/window\.location\.href\s*=\s*["'][^"']*\/builder[^"']*["']/gi, '')

  // Check if it's already HTML (has proper HTML structure)
  if (sanitized.trim().startsWith('<!DOCTYPE') || 
      sanitized.trim().startsWith('<html') ||
      (sanitized.includes('<head>') && sanitized.includes('<body>'))) {
    return sanitized
  }

  // Check if it's React/JSX code that needs conversion
  const isReactCode = 
    sanitized.includes('export default function') ||
    sanitized.includes('export default class') ||
    sanitized.includes('import React') ||
    sanitized.includes('useState') ||
    sanitized.includes('useEffect') ||
    sanitized.includes('className=') ||
    sanitized.includes('```tsx') ||
    sanitized.includes('```jsx')

  if (isReactCode) {
    // Remove code blocks markers
    sanitized = sanitized.replace(/```tsx|```jsx|```html|```/g, '')
    
    // Remove imports
    sanitized = sanitized.replace(/import\s+.*?from\s+['"][^'"]+['"]\s*;?\n?/g, '')
    sanitized = sanitized.replace(/import\s+['"][^'"]+['"]\s*;?\n?/g, '')
    
    // Remove 'use client' directive
    sanitized = sanitized.replace(/['"]use client['"]\s*;?\n?/g, '')
    
    // Remove export statements and function declarations
    sanitized = sanitized.replace(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{?\s*\n?\s*return\s*\(?/g, '')
    sanitized = sanitized.replace(/function\s+\w+\s*\([^)]*\)\s*\{?\s*\n?\s*return\s*\(?/g, '')
    
    // Remove const declarations for components
    sanitized = sanitized.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{?\s*\n?\s*return\s*\(?/g, '')
    sanitized = sanitized.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(?/g, '')
    
    // Remove closing braces at the end
    sanitized = sanitized.replace(/\)?\s*;?\s*\}?\s*$/, '')
    
    // Convert className to class
    sanitized = sanitized.replace(/className=/g, 'class=')
    
    // Remove JSX comments
    sanitized = sanitized.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    
    // Convert simple JSX expressions
    sanitized = sanitized.replace(/\{['"`]([^'"`]+)['"`]\}/g, '$1')
    
    // Remove .map() constructs
    sanitized = sanitized.replace(/\{[\s\S]*?\.map\([\s\S]*?\)\}/g, '')
  }

  // Wrap in basic HTML structure with Tailwind CSS if needed
  if (!sanitized.includes('<html') && !sanitized.includes('<!DOCTYPE')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${sanitized.trim()}
</body>
</html>`
  }

  // For complete HTML, inject base target into existing head
  if (sanitized.includes('<head>')) {
    return sanitized.replace('<head>', '<head>\n  <base target="_blank">')
  }

  return sanitized
}

// ✅ BuilderContent component (uses useSearchParams)
function BuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [step, setStep] = useState<'select-type' | 'build'>('select-type')
  const [projectType, setProjectType] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [generating, setGenerating] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [isLoadedProject, setIsLoadedProject] = useState(false)
  const [showReactWarning, setShowReactWarning] = useState(false)

  // ✅ NEW: Chat state variables
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([])
  const [chatLoading, setChatLoading] = useState(false)

  // ✅ Handle chat interaction
  const handleChat = async () => {
    if (!chatMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (!generatedCode) {
      toast.error('Generate some code first!')
      return
    }

    console.log('💬 Sending chat message:', chatMessage)

    setChatLoading(true)
    
    // Store the current message before clearing input
    const currentMessage = chatMessage.trim()
    
    // Add user message to history immediately
    const newHistory = [
      ...chatHistory,
      { role: 'user', content: currentMessage }
    ]
    setChatHistory(newHistory)
    setChatMessage('') // Clear input immediately

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          currentCode: generatedCode,
          conversationHistory: chatHistory,
          projectType: projectType
        })
      })

      console.log('📡 Chat response status:', res.status)

      const data = await res.json()
      console.log('📦 Chat response data:', data)

      if (res.ok && data.code) {
        // ✅ Update code in preview
        setGeneratedCode(data.code)

        // ✅ Add AI response to history
        setChatHistory([
          ...newHistory,
          { 
            role: 'assistant', 
            content: data.message || '✅ Code updated successfully! Check the preview.' 
          }
        ])

        // ✅ Show success toast
        toast.success('Code updated!')
        
      } else {
        // ❌ Show error message
        const errorMsg = data.error || 'Chat failed. Please try again.'
        
        setChatHistory([
          ...newHistory,
          { role: 'assistant', content: `❌ ${errorMsg}` }
        ])
        
        toast.error(errorMsg)
      }
    } catch (err: any) {
      console.error('❌ Chat error:', err)
      
      // Add error message to chat
      setChatHistory([
        ...newHistory,
        { 
          role: 'assistant', 
          content: '❌ Failed to connect to AI assistant. Please check your connection and try again.' 
        }
      ])
      
      toast.error('Connection failed: ' + err.message)
    } finally {
      setChatLoading(false)
    }
  }

  // ✅ Load project on mount
  useEffect(() => {
    const projectId = searchParams.get('project')
    if (projectId) {
      setStep('build')
      loadProject(projectId)
    }
  }, [searchParams])

  const loadProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()

      if (data.code) {
        // Always set project data
        setCurrentProjectId(projectId)
        setProjectName(data.name)
        setProjectDescription(data.description)
        setGeneratedCode(data.code)
        setProjectType(data.type || 'landing')
        setIsLoadedProject(true)

        // Check if it's React/TSX code and show warning (but still load the code)
        const isReactCode = 
          data.code.includes('```tsx') || 
          data.code.includes('```jsx') ||
          data.code.includes('import React') ||
          (data.code.includes('import {') && data.code.includes('from "react"')) ||
          data.code.includes('useState') ||
          data.code.includes('useEffect')

        if (isReactCode) {
          setShowReactWarning(true)
        }
      }
    } catch (err) {
      console.error('Failed to load:', err)
    }
  }

  const handleTypeSelect = (type: string) => {
    setProjectType(type)
    setStep('build')
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    setIsLoadedProject(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          type: projectType 
        })
      })

      const data = await res.json()

      if (res.ok) {
        setGeneratedCode(data.code)
      } else {
        alert(data.error || 'Failed to generate')
      }
    } catch (err) {
      alert('Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!projectName.trim() || !generatedCode) {
      alert('Please enter project name and generate code')
      return
    }

    setSaving(true)

    try {
      const url = currentProjectId 
        ? `/api/projects/${currentProjectId}`
        : '/api/projects'
      
      const method = currentProjectId ? 'PUT' : 'POST'

      // ✅ Sanitize before saving
      const sanitizedCode = sanitizeForPreview(generatedCode)

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          code: sanitizedCode,
          type: projectType
        })
      })

      if (res.ok) {
        alert('Saved successfully!')
        router.push('/dashboard')
      } else {
        alert('Save failed')
      }
    } catch (err) {
      alert('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const downloadCode = () => {
    const sanitizedCode = sanitizeForPreview(generatedCode)
    const blob = new Blob([sanitizedCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'project'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ✅ React Warning Screen
  if (showReactWarning) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
        </header>

        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="text-5xl">⚠️</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  React/TypeScript Project Detected
                </h3>
                <p className="text-gray-700 mb-4">
                  This project uses React/JSX. The preview may not render perfectly, but you can still edit the code.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setShowReactWarning(false)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
                  >
                    ✏️ Edit Code Anyway
                  </button>
                  <button
                    onClick={() => {
                      setShowReactWarning(false)
                      setPrompt(`Convert "${projectName}" to pure HTML with Tailwind CSS`)
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    🔄 Generate HTML Version
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-semibold"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Project Type Selection Screen
  if (step === 'select-type') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Project Type
            </h1>
            <p className="text-gray-600 text-lg">
              Select what you want to build
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: 'landing', icon: '🌐', title: 'Landing Page', desc: 'Marketing or product landing page' },
              { id: 'webapp', icon: '⚡', title: 'Web App', desc: 'Interactive web application' },
              { id: 'dashboard', icon: '📊', title: 'Dashboard', desc: 'Data visualization dashboard' },
              { id: 'portfolio', icon: '💼', title: 'Portfolio', desc: 'Personal or professional portfolio' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-purple-500 hover:shadow-xl transition-all text-left group"
              >
                <div className="text-6xl mb-4">{type.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition">
                  {type.title}
                </h3>
                <p className="text-gray-600">{type.desc}</p>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-6">Or start with a template:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setProjectType(template.type)
                    setPrompt(template.description)
                    setStep('build')
                    // Use the actual template code
                    setGeneratedCode(template.code)
                    setProjectName(`${template.name} Project`)
                    toast.success(`Loaded "${template.name}" template!`)
                  }}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{template.icon}</span>
                    <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition">{template.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Build Screen
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← Dashboard
            </button>

            <div className="flex items-center gap-2">
              {generatedCode && (
                <>
                  {/* Copy Code */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast.success('Code copied to clipboard!')
                    }}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
                    title="Copy Code"
                  >
                    📋 Copy
                  </button>
                  
                  {/* Download */}
                  <button
                    onClick={downloadCode}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
                    title="Download HTML"
                  >
                    💾 Download
                  </button>
                  
                  {/* Preview in New Tab */}
                  {currentProjectId && (
                    <button
                      onClick={() => window.open(`/preview/${currentProjectId}`, '_blank')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      title="Open Preview"
                    >
                      👁️ Preview
                    </button>
                  )}
                </>
              )}
              
              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || !generatedCode}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : '✅ Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-4">
                {currentProjectId ? 'Edit Project' : 'Create Project'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">What to build? *</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {generating ? '✨ Generating...' : '✨ Generate with AI'}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {isLoadedProject ? (
              // ✅ LOADED PROJECT: Show preview button
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-xl font-semibold mb-4">Preview</h3>
                <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4">👁️</div>
                  <h4 className="text-lg font-semibold mb-2">Project Loaded</h4>
                  <p className="text-gray-600 mb-6">Click below to open preview in new tab</p>
                  <button
                    onClick={() => window.open(`/preview/${currentProjectId}`, '_blank')}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 font-semibold"
                  >
                    <span>👁️ Open Preview</span>
                    <span>→</span>
                  </button>
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-gray-500 mb-3">Want to make changes?</p>
                    <button
                      onClick={() => setIsLoadedProject(false)}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Generate New Version →
                    </button>
                  </div>
                </div>
              </div>
            ) : generatedCode ? (
              // ✅ NEW GENERATION: Show live iframe
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Live Preview</h3>
                  {currentProjectId && (
                    <button
                      onClick={() => window.open(`/preview/${currentProjectId}`, '_blank')}
                      className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      🔗 Open Full Preview
                    </button>
                  )}
                </div>
                <div className="bg-gray-100 rounded-lg overflow-hidden border" style={{ height: '500px' }}>
                  <iframe
                    srcDoc={sanitizeForPreview(generatedCode)}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    title="Live Preview"
                  />
                </div>
                
                {/* Quick Actions Bar */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast.success('Code copied!')
                    }}
                    className="flex-1 min-w-[120px] px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    📋 Copy Code
                  </button>
                  <button
                    onClick={downloadCode}
                    className="flex-1 min-w-[120px] px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    💾 Download
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 min-w-[120px] px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? '⏳ Saving...' : '✅ Save Project'}
                  </button>
                </div>
              </div>
            ) : (
              // ✅ NO CODE YET
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-xl font-semibold mb-4">Preview</h3>
                <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed">
                  <div className="text-6xl mb-4">🚀</div>
                  <h4 className="text-lg font-semibold mb-2">No Preview Yet</h4>
                  <p className="text-gray-600">Generate code to see a live preview</p>
                </div>
              </div>
            )}

            {/* Code View */}
            {generatedCode && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Generated Code</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast.success('Code copied!')
                    }}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-green-400 font-mono">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center"
        title="AI Chat Assistant"
      >
        {chatOpen ? '✕' : '💬'}
      </button>

      {/* ✅ NEW: Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold">AI Assistant</h3>
                <p className="text-xs text-purple-100">Ask me to improve your code</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              ✕
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-sm">Start a conversation!</p>
                <p className="text-xs mt-2">Try: "Add a navigation bar" or "Make it responsive"</p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleChat()} // ✅ Changed from handleChatMessage
                placeholder="Ask AI to improve your code..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                disabled={chatLoading}
              />
              <button
                onClick={handleChat} // ✅ Changed from handleChatMessage
                disabled={chatLoading || !chatMessage.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chatLoading ? '⏳' : '➤'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send
            </p>
          </div>
        </div>
      )}
      
      <Toaster position="top-right" />
    </div>
  )
}

// ✅ Main component with Suspense wrapper
export default function Builder() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading Builder...</p>
        </div>
      </div>
    }>
      <BuilderContent />
    </Suspense>
  )
}