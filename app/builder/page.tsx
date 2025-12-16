'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'
import { templates } from '@/lib/templates'
import { analytics } from '@/lib/analytics'
import { Loader2 } from 'lucide-react'
import { EnhancedPromptInput } from '@/components/EnhancedPromptInput'

// Sanitize function
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
    .replace(/import\s+{\s*useRouter\s*}\s+from\s+['"]next\/navigation['"]/gi, '')
    .replace(/import\s+{\s*Link\s*}\s+from\s+['"]next\/link['"]/gi, '')
    .replace(/const\s+router\s*=\s*useRouter\(\)/gi, '')
    .replace(/router\.push\([^)]*\)/gi, '')
    .replace(/router\.replace\([^)]*\)/gi, '')
    .replace(/window\.location\s*=\s*["'][^"']*\/dashboard[^"']*["']/gi, '')
    .replace(/window\.location\.href\s*=\s*["'][^"']*\/dashboard[^"']*["']/gi, '')
    .replace(/window\.location\s*=\s*["'][^"']*\/builder[^"']*["']/gi, '')
    .replace(/window\.location\.href\s*=\s*["'][^"']*\/builder[^"']*["']/gi, '')

  if (sanitized.trim().startsWith('<!DOCTYPE') || 
      sanitized.trim().startsWith('<html') ||
      (sanitized.includes('<head>') && sanitized.includes('<body>'))) {
    return sanitized
  }

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
    sanitized = sanitized.replace(/```tsx|```jsx|```html|```/g, '')
    sanitized = sanitized.replace(/import\s+.*?from\s+['"][^'"]+['"]\s*;?\n?/g, '')
    sanitized = sanitized.replace(/import\s+['"][^'"]+['"]\s*;?\n?/g, '')
    sanitized = sanitized.replace(/['"]use client['"]\s*;?\n?/g, '')
    sanitized = sanitized.replace(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{?\s*\n?\s*return\s*\(?/g, '')
    sanitized = sanitized.replace(/function\s+\w+\s*\([^)]*\)\s*\{?\s*\n?\s*return\s*\(?/g, '')
    sanitized = sanitized.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{?\s*\n?\s*return\s*\(?/g, '')
    sanitized = sanitized.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(?/g, '')
    sanitized = sanitized.replace(/\)?\s*;?\s*\}?\s*$/, '')
    sanitized = sanitized.replace(/className=/g, 'class=')
    sanitized = sanitized.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    sanitized = sanitized.replace(/\{['"`]([^'"`]+)['"`]\}/g, '$1')
    sanitized = sanitized.replace(/\{[\s\S]*?\.map\([\s\S]*?\)\}/g, '')
  }

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

  if (sanitized.includes('<head>')) {
    return sanitized.replace('<head>', '<head>\n  <base target="_blank">')
  }

  return sanitized
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
          toast.success('Code generated successfully!')
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
        if (!currentProjectId) {
          analytics.projectCreated(projectType)
        }
        toast.success('Saved successfully!')
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
                      toast.success('Code copied to clipboard!')
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
                      onClick={() => window.open(`/preview/${currentProjectId}`, '_blank')}
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