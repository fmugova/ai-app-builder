'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'
import { templates } from '@/lib/templates'
import { analytics } from '@/lib/analytics'
import { Loader2 } from 'lucide-react'
import { EnhancedPromptInput } from '@/components/EnhancedPromptInput'

// Enhanced sanitize function with proper React support
function sanitizeForPreview(code: string): string {
  let sanitized = code
    .replace(/<a\s+[^>]*href=["']\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']https?:\/\/[^"']*\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/builder["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/builder["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/auth[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/api[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/href=["']\/dashboard["']/gi, 'href="#"')
    .replace(/href=["']\/builder["']/gi, 'href="#"')
    .replace(/href=["']\/auth[^"']*["']/gi, 'href="#"')
    .replace(/href=["']\/api[^"']*["']/gi, 'href="#"')
    .replace(/onclick=["'][^"']*dashboard[^"']*["']/gi, 'onclick="return false"')
    .replace(/onclick=["'][^"']*builder[^"']*["']/gi, 'onclick="return false"')
    .replace(/onclick=["'][^"']*router\.push[^"']*["']/gi, 'onclick="return false"')

  // If already a complete HTML document, return as-is
  if (sanitized.trim().startsWith('<!DOCTYPE') || 
      sanitized.trim().startsWith('<html') ||
      (sanitized.includes('<head>') && sanitized.includes('<body>'))) {
    if (sanitized.includes('<head>') && !sanitized.includes('<base')) {
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
    sanitized.includes('```tsx') ||
    sanitized.includes('```jsx') ||
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(/i.test(sanitized)

  if (isReactCode) {
    // Clean markdown code blocks
    let reactCode = sanitized.replace(/```(?:tsx|jsx|javascript|js)?\n?/g, '')
    
    // Extract JSX content from component
    const componentMatch = reactCode.match(/export\s+default\s+function\s+\w+[\s\S]*?\{[\s\S]*?return\s*\([\s\S]*?\)\s*\}/s)
    if (componentMatch) {
      const returnMatch = componentMatch[0].match(/return\s*\([\s\S]*?\)(?=\s*\})/s)
      if (returnMatch) {
        reactCode = returnMatch[0].replace(/^return\s*\(/, '').replace(/\)$/, '')
      }
    }
    
    // Wrap in HTML with React via CDN and Babel for JSX transpilation
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script>window.tailwindcss = { config: {} };</script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
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

  // Regular HTML content
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script>window.tailwindcss = { config: {} };</script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${sanitized.trim()}
</body>
</html>`
}

function BuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [step, setStep] = useState<'select-type' | 'build'>('select-type')
  const [projectType, setProjectType] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [isLoadedProject, setIsLoadedProject] = useState(false)
  const [showReactWarning, setShowReactWarning] = useState(false)

  // Animating generating text
  useEffect(() => {
    if (generating) {
      const interval = setInterval(() => {
        setGeneratingStep(prev => (prev + 1) % 4)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [generating])

  const getGeneratingText = () => {
    const dots = '.'.repeat(generatingStep)
    const spaces = '\u00A0'.repeat(3 - generatingStep)
    return `Generating${dots}${spaces}`
  }

  // ✨ AI Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string, files?: string[], urls?: string[]}>>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  // ✨ Handle file upload
  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const validTypes = ['.pdf', '.doc', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg']
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      return validTypes.includes(ext)
    })
    if (validFiles.length < fileArray.length) {
      toast.error('Some files were skipped (unsupported format)')
    }
    setUploadedFiles(prev => [...prev, ...validFiles])
    toast.success(`Added ${validFiles.length} file(s)`, {
      duration: 2000,
      id: 'files-added',
    })
  }

  // ✨ Add URL
  const handleAddUrl = () => {
    const url = window.prompt('Enter website URL to analyze:\n\nExample: https://example.com')
    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        toast.error('Please enter a valid URL starting with http:// or https://')
        return
      }
      setUploadedUrls(prev => [...prev, url])
      toast.success('URL added! Include it in your next message.', {
        duration: 2000,
        id: 'url-added',
      })
    }
  }

  // ✨ Remove file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ✨ Remove URL
  const removeUrl = (index: number) => {
    setUploadedUrls(prev => prev.filter((_, i) => i !== index))
  }

  // ✨ Handle chat with file/URL support
  const handleChat = async () => {
    if (!chatMessage.trim() && uploadedFiles.length === 0 && uploadedUrls.length === 0) {
      toast.error('Please enter a message or add files/URLs')
      return
    }
    if (!generatedCode) {
      toast.error('Generate some code first!')
      return
    }
    setChatLoading(true)
    const currentMessage = chatMessage.trim() || 'Process uploaded files and URLs'
    const newHistory = [
      ...chatHistory,
      { 
        role: 'user', 
        content: currentMessage,
        files: uploadedFiles.map(f => f.name),
        urls: uploadedUrls
      }
    ]
    setChatHistory(newHistory)
    setChatMessage('')
    try {
      const formData = new FormData()
      formData.append('message', currentMessage)
      formData.append('currentCode', generatedCode)
      formData.append('projectType', projectType)
      formData.append('urls', JSON.stringify(uploadedUrls))
      formData.append('conversationHistory', JSON.stringify(chatHistory))
      // Append files
      uploadedFiles.forEach(file => {
        formData.append('files', file)
      })
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.code) {
        setGeneratedCode(data.code)
        setChatHistory([
          ...newHistory,
          { 
            role: 'assistant', 
            content: data.message || '✅ Code updated successfully!'
          }
        ])
        toast.success('Code updated!', {
          duration: 2000,
          id: 'code-updated',
        })
        setUploadedFiles([])
        setUploadedUrls([])
      } else {
        const errorMsg = data.error || 'Chat failed. Please try again.'
        setChatHistory([
          ...newHistory,
          { role: 'assistant', content: `❌ ${errorMsg}` }
        ])
        toast.error(errorMsg)
      }
    } catch (err: any) {
      console.error('❌ Chat error:', err)
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
        setCurrentProjectId(projectId)
        setProjectName(data.name)
        setProjectDescription(data.description)
        setGeneratedCode(data.code)
        setProjectType(data.type || 'landing')
        setIsLoadedProject(true)

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
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setGenerating(true)
    setGeneratingStep(0)
    setIsLoadedProject(false)

    const maxClientRetries = 2
    
    for (let i = 0; i < maxClientRetries; i++) {
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

        if (res.status === 503 && data.retryable && i < maxClientRetries - 1) {
          toast('Claude is busy, retrying...', { icon: '⏳' })
          await new Promise(r => setTimeout(r, 3000))
          continue
        }

        if (res.ok) {
          setGeneratedCode(data.code)
          analytics.aiGeneration(true, projectType)
          toast.success('Code generated successfully!', {
            duration: 2000,
            id: 'code-generated',
          })
        } else {
          analytics.aiGeneration(false, projectType)
          toast.error(data.error || 'Failed to generate')
        }
        break
      } catch (err) {
        analytics.aiGeneration(false, projectType)
        if (i === maxClientRetries - 1) {
          toast.error('Generation failed. Please try again.')
        }
      } finally {
        setGenerating(false)
      }
    }
  }

  const handleSave = async () => {
    if (!projectName.trim() || !generatedCode) {
      toast.error('Please enter project name and generate code')
      return
    }

    setSaving(true)

    try {
      const url = currentProjectId 
        ? `/api/projects/${currentProjectId}`
        : '/api/projects'
      
      const method = currentProjectId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          code: generatedCode,
          type: projectType
        })
      })

      if (res.ok) {
        if (!currentProjectId) {
          analytics.projectCreated(projectType)
        }
        toast.success('Saved successfully!', {
          duration: 2000,
          id: 'builder-saved',
        })
        router.push('/dashboard')
      } else {
        toast.error('Save failed')
      }
    } catch (err) {
      toast.error('Save failed')
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
                    setGeneratedCode(template.code)
                    setProjectName(`${template.name} Project`)
                    toast.success(`Loaded "${template.name}" template!`, {
                      duration: 2000,
                      id: 'template-loaded',
                    })
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

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast.success('Code copied to clipboard!', {
                        duration: 2000,
                        id: 'code-copied-1',
                      })
                    }}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    📋 Copy
                  </button>
                  
                  <button
                    onClick={downloadCode}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    💾 Download
                  </button>
                  
                  {currentProjectId && (
                    <button
                      onClick={() => window.open(`/preview/${currentProjectId}`, '_blank', 'noopener,noreferrer')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      👁️ Preview
                    </button>
                  )}
                </>
              )}
              
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    disabled={generating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    disabled={generating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Project Type</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    disabled={generating}
                  >
                    <option value="landing">Landing Page</option>
                    <option value="webapp">Web App</option>
                    <option value="dashboard">Dashboard</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="blog">Blog</option>
                  </select>
                </div>

                <EnhancedPromptInput
                  value={prompt}
                  onChange={setPrompt}
                  onGenerate={handleGenerate}
                  isGenerating={generating}
                />

                {generating && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-900 text-lg font-medium">
                        {getGeneratingText()}
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        This may take 10-30 seconds
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isLoadedProject ? (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-xl font-semibold mb-4">Preview</h3>
                <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4">👁️</div>
                  <h4 className="text-lg font-semibold mb-2">Project Loaded</h4>
                  <p className="text-gray-600 mb-6">Click below to open preview in new tab</p>
                  <button
                    onClick={() => window.open(`/preview/${currentProjectId}`, '_blank', 'noopener,noreferrer')}
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
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Live Preview</h3>
                  {currentProjectId && (
                    <button
                      onClick={() => window.open(`/preview/${currentProjectId}`, '_blank', 'noopener,noreferrer')}
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
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast.success('Code copied!', {
                        duration: 2000,
                        id: 'code-copied-2',
                      })
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
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-xl font-semibold mb-4">Preview</h3>
                <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed">
                  <div className="text-6xl mb-4">🚀</div>
                  <h4 className="text-lg font-semibold mb-2">No Preview Yet</h4>
                  <p className="text-gray-600">Generate code to see a live preview</p>
                </div>
              </div>
            )}

            {generatedCode && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Generated Code</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast.success('Code copied!', {
                        duration: 2000,
                        id: 'code-copied-3',
                      })
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

      {/* ✨ Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center"
        title="AI Chat Assistant"
      >
        {chatOpen ? '✕' : '💬'}
      </button>

      {/* ✨ Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold">AI Assistant</h3>
                <p className="text-xs text-purple-100">Upload files, add URLs, ask anything!</p>
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
                <p className="text-xs mt-2">Try: \"Add a navigation bar\" or upload a website for inspiration</p>
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
                    {msg.files && msg.files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.files.map((fileName, idx) => (
                          <div key={idx} className="text-xs opacity-75 flex items-center gap-1">
                            <span>📄</span>
                            <span>{fileName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.urls && msg.urls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.urls.map((url, idx) => (
                          <div key={idx} className="text-xs opacity-75 flex items-center gap-1">
                            <span>🔗</span>
                            <span className="truncate">{url}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !chatLoading) handleChat() }}
                placeholder="Ask the AI assistant..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                disabled={chatLoading}
              />
              <button
                onClick={handleChat}
                disabled={chatLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {chatLoading ? '...' : 'Send'}
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handleFileUpload(e.target.files)}
                  disabled={chatLoading}
                />
                <span>📎 Attach File</span>
              </label>
              <button
                onClick={handleAddUrl}
                disabled={chatLoading}
                className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"
              >
                ➕ Add URL
              </button>
            </div>
            {/* Show uploaded files/urls */}
            {(uploadedFiles.length > 0 || uploadedUrls.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {uploadedFiles.map((file, i) => (
                  <span key={i} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                    📄 {file.name}
                    <button onClick={() => removeFile(i)} className="ml-1 text-red-500 hover:text-red-700">✕</button>
                  </span>
                ))}
                {uploadedUrls.map((url, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                    🔗 {url}
                    <button onClick={() => removeUrl(i)} className="ml-1 text-red-500 hover:text-red-700">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  )
}

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

