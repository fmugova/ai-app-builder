'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Code, Globe, Loader2, Download, Copy, Check, Save, MessageSquare, Send, X, ArrowLeft, LogOut } from 'lucide-react'
import { saveProject as saveProjectToHistory, getProject } from '@/utils/projectHistory'

const projectTypes = [
  { id: 'landing', name: 'Landing Page', icon: Globe, desc: 'Marketing or product landing page' },
  { id: 'webapp', name: 'Web App', icon: Code, desc: 'Interactive web application' },
  { id: 'dashboard', name: 'Dashboard', icon: Sparkles, desc: 'Data visualization dashboard' },
  { id: 'portfolio', name: 'Portfolio', icon: Globe, desc: 'Personal or professional portfolio' },
]

const templates = [
  {
    id: 'saas-landing',
    name: 'SaaS Landing Page',
    type: 'landing',
    description: 'Modern SaaS landing page with hero section, features grid, pricing table, and call-to-action. Dark theme with gradient accents.',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Product Page',
    type: 'webapp',
    description: 'Product showcase with image gallery, add to cart functionality, reviews section, and related products. Clean, minimal design.',
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    type: 'dashboard',
    description: 'Professional analytics dashboard with line charts, bar charts, KPI cards, and data tables. Dark mode with blue/purple theme.',
  },
]

export default function Builder() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState('input')
  const [projectType, setProjectType] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [usage, setUsage] = useState<any>(null)
  const [projectName, setProjectName] = useState('')

  // Load existing project if project ID is in URL
  useEffect(() => {
    const projectId = searchParams.get('project')
    if (projectId) {
      const project = getProject(projectId)
      if (project) {
        // Extract project type from the project type name
        const typeMapping: Record<string, string> = {
          'Landing Page': 'landing',
          'Web App': 'webapp',
          'Dashboard': 'dashboard',
          'Portfolio': 'portfolio'
        }

        setProjectName(project.name)
        setProjectType(typeMapping[project.type] || 'webapp')
        setDescription(project.description || '')
        setGeneratedCode(project.code || '')

        // If there's code, go directly to preview
        if (project.code) {
          setStep('preview')
        }
      }
    }
  }, [searchParams])

  const generateApp = async () => {
    if (!description.trim()) {
      setError('Please describe what you want to build')
      return
    }

    setLoading(true)
    setError('')
    setStep('generating')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType, description }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`Generation limit reached! Upgrade your plan to continue. (${data.used}/${data.limit} used)`)
        }
        throw new Error(data.error || 'Generation failed')
      }

      setGeneratedCode(data.code)
      setUsage(data.usage)
      setChatMessages([])
      setStep('preview')
      
      const generatedProjectName = `${projectTypes.find(t => t.id === projectType)?.name} - ${new Date().toLocaleDateString()}`
      setProjectName(generatedProjectName)
      
      // 🆕 AUTO-SAVE TO PROJECT HISTORY
      try {
        const savedProject = saveProjectToHistory({
          name: generatedProjectName,
          type: projectTypes.find(t => t.id === projectType)?.name as any || 'Web App',
          description: description.substring(0, 200), // First 200 chars
          code: data.code,
        })
        console.log('✅ Project auto-saved to history:', savedProject.id)
      } catch (saveError) {
        console.error('Failed to save to history:', saveError)
        // Don't stop the flow if history save fails
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !generatedCode) return

    const userMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          description,
          existingCode: generatedCode,
          refinement: chatInput
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Refinement failed')
      }

      setGeneratedCode(data.code)
      setUsage(data.usage)
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Code updated successfully! ✨' }])
      
      // 🆕 UPDATE PROJECT HISTORY AFTER REFINEMENT
      try {
        saveProjectToHistory({
          name: projectName,
          type: projectTypes.find(t => t.id === projectType)?.name as any || 'Web App',
          description: description.substring(0, 200),
          code: data.code,
        })
        console.log('✅ Project updated in history after refinement')
      } catch (saveError) {
        console.error('Failed to update history:', saveError)
      }
      
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err instanceof Error ? err.message : 'Update failed'}` 
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const saveProject = async () => {
    if (!generatedCode) return

    try {
      // Save to your database
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description,
          type: projectType,
          code: generatedCode
        }),
      })

      if (!res.ok) throw new Error('Save failed')

      // 🆕 ALSO SAVE TO LOCAL HISTORY
      saveProjectToHistory({
        name: projectName,
        type: projectTypes.find(t => t.id === projectType)?.name as any || 'Web App',
        description: description.substring(0, 200),
        code: generatedCode,
      })

      alert('Project saved successfully! 💾')
    } catch (err) {
      alert('Failed to save project')
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || projectType}-component.jsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetBuilder = () => {
    setStep('input')
    setProjectType('')
    setDescription('')
    setGeneratedCode('')
    setError('')
    setChatMessages([])
    setProjectName('')
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
      });
      window.location.href = "/auth/signin";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Creating Your {projectType}...</h2>
          <p className="text-gray-600">Claude is writing beautiful code for you</p>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={resetBuilder}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Sparkles className="w-6 h-6 text-purple-600" />
              <div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="text-xl font-bold text-gray-800 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2"
                />
                {usage && (
                  <p className="text-xs text-gray-500">
                    {usage.remaining === -1 ? 'Unlimited' : `${usage.remaining} generations remaining`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                AI Chat
              </button>
              <button
                onClick={saveProject}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={copyCode}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={downloadCode}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-gray-900 rounded-lg p-6 overflow-auto">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap break-words">
                {generatedCode}
              </pre>
            </div>
          </div>
        </div>

        {showChat && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">AI Refinements</h2>
              <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Ask Claude to modify your code</p>
                  <p className="text-xs mt-2">Examples: "Add dark mode", "Make it more colorful"</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-purple-100 ml-4' : 'bg-gray-100 mr-4'}`}>
                    <p className="text-sm text-gray-800">{msg.content}</p>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Updating code...</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask for changes..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI App Builder
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {!projectType ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
              What would you like to build?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setProjectType(type.id)}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-500 text-left group"
                  >
                    <Icon className="w-10 h-10 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{type.name}</h3>
                    <p className="text-gray-600">{type.desc}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Or start with a template:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setProjectType(template.type)
                      setDescription(template.description)
                    }}
                    className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg text-left hover:shadow-lg transition border-2 border-transparent hover:border-purple-500"
                  >
                    <h4 className="font-bold text-gray-800 mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Describe Your {projectTypes.find(t => t.id === projectType)?.name}
                </h2>
                <button
                  onClick={() => setProjectType('')}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Change Type
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Be as detailed as possible. Include features, design preferences, colors, and functionality.
              </p>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Create a modern fitness tracking dashboard with a dark theme. Include charts for workout progress, a calendar view for scheduled workouts, and cards showing weekly stats. Use blue and purple accents..."
              className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none text-gray-800"
            />

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={generateApp}
              disabled={loading}
              className="mt-6 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate My {projectTypes.find(t => t.id === projectType)?.name}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}