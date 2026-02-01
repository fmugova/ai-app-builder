'use client'

import { useState, useRef, useEffect } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
// import { useSession } from 'next-auth/react'
// import { templates, getTemplatesByCategory } from '@/lib/templates'
import dynamic from 'next/dynamic'
import PromptAssistant from '@/components/PromptAssistant'
import PreviewFrame from '@/components/PreviewFrame'
import type { ValidationResult, ValidationError } from '@/lib/types/validation'
import { 
  HelpCircle, Upload, X, Send, ChevronLeft,
  Download, Github, Globe, Code, Save, Sparkles, RefreshCw,
  Link as LinkIcon, FileText, Image as ImageIcon
} from 'lucide-react'
import React from 'react'

// Lazy load heavy components
const PromptGuide = dynamic(() => import('@/components/PromptGuide'), {
  loading: () => null,
  ssr: false
})

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface GeneratedCode {
  html: string | null
  css: string | null
  js: string | null
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MessageTimestamp({ timestamp }: { timestamp: Date }) {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  
  let display = ''
  if (diffSec < 60) {
    display = `${diffSec}s ago`
  } else if (diffSec < 3600) {
    display = `${Math.floor(diffSec / 60)}m ago`
  } else if (diffSec < 86400) {
    display = `${Math.floor(diffSec / 3600)}h ago`
  } else {
    display = date.toLocaleDateString()
  }
  
  return (
    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{display}</span>
  )
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PreviewFrame error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-red-500">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="font-semibold mb-1">Preview failed to load</div>
          <div className="text-xs">{this.state.error?.message || 'Unknown error'}</div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatBuilder() {
  const router = useRouter()
  // const { data: session } = useSession()
  
  // Message ID generator
  const messageIdCounter = useRef(0)
  const generateMessageId = () => {
    return `${Date.now()}-${++messageIdCounter.current}`
  }
  
  // State
  const [prompt, setPrompt] = useState('')
  const [input, setInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | undefined>()
  const [projectName, setProjectName] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  // Removed unused state: showTemplates, selectedCategory, includeAuth, authProvider
  const [showAssistant, setShowAssistant] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [chatWidth, setChatWidth] = useState(50) // Percentage
  
  // State for validation
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode>({ 
    html: null, 
    css: null, 
    js: null 
  })
  const [validation, setValidation] = useState<ValidationResult | undefined>(undefined)
  
  // Progress tracking
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const projectIdParam = urlParams.get('project')
    const pageId = urlParams.get('page')
    
    if (projectIdParam && pageId) {
      loadPage(projectIdParam, pageId)
    } else if (projectIdParam) {
      loadProject(projectIdParam)
    }
  }, [])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])
  
  // ============================================================================
  // PROJECT LOADING
  // ============================================================================

  const loadProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      const data = await response.json()
      
      if (response.ok) {
        setProjectId(data.id)
        setProjectName(data.name)
        
        const code = data.code || data.html || data.htmlCode || ''
        
        if (code) {
          setCurrentCode(code)
          setGeneratedCode({ html: code, css: null, js: null })
          toast.success('Project loaded!')
        }
      }
    } catch {
      toast.error('Failed to load project')
    }
  }
  
  const loadPage = async (projectId: string, pageId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/pages/${pageId}`)
      const data = await response.json()
      
      if (response.ok) {
        setProjectId(projectId)
        setProjectName(data.name)
        
        const code = data.code || ''
        
        if (code) {
          setCurrentCode(code)
          setGeneratedCode({ html: code, css: null, js: null })
          toast.success('Page loaded!')
        }
      }
    } catch {
      toast.error('Failed to load page')
    }
  }
  
  // ============================================================================
  // URL PARSING
  // ============================================================================
  
  const handleParseUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL')
      return
    }
    
    const urlMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: `🔗 Parse website: ${urlInput}`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, urlMessage])
    
    const prompt = `Create a website similar to ${urlInput}. Analyze and recreate the design, layout, and functionality.`
    setInput(prompt)
    setUrlInput('')
  }
  
  // ============================================================================
  // CODE GENERATION
  // ============================================================================

  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || prompt || input

    if (!promptToUse.trim()) {
      toast.error('Please enter a prompt')
      return { success: false, error: 'No prompt provided' }
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedCode({ html: null, css: null, js: null })
    setValidation(undefined)

    try {
      const response = await fetch('/api/chatbot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          projectId,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedHtml = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue
            const data = JSON.parse(jsonStr)

            switch (data.type) {
              case 'progress':
                if (typeof data.length === 'number') {
                  const progress = Math.min(95, (data.length / 35000) * 100)
                  setGenerationProgress(progress)
                }
                break
              case 'projectCreated':
                if (data.projectId) {
                  setProjectId(data.projectId)
                }
                break
              case 'complete':
                if (data.projectId && data.projectId !== projectId) {
                  setProjectId(data.projectId)
                }
                setGenerationProgress(100)
                
                // Set validation from complete event
                if (data.validation) {
                  setValidation(data.validation)
                }
                break
              case 'html':
                setGeneratedCode({ html: data.content, css: null, js: null })
                setCurrentCode(data.content)
                break
              case 'html_chunk':
                accumulatedHtml += data.content
                if (data.isLast) {
                  setGeneratedCode({ html: accumulatedHtml, css: null, js: null })
                  setCurrentCode(accumulatedHtml)
                }
                break
              case 'error':
                toast.error(data.message || 'Generation error')
                
                const errors: ValidationError[] = (data.errors || []).map((err: unknown) => {
                  const errorObj = err as Partial<ValidationError>
                  return {
                    message: errorObj.message || String(err),
                    line: errorObj.line,
                    column: errorObj.column,
                    severity: errorObj.severity || 'error',
                    ...errorObj
                  }
                })
                
                setValidation({
                  validationPassed: false,
                  validationScore: data.validationScore ?? 0,
                  errors,
                  warnings: [],
                  passed: false,
                })
                break
              default:
                break
            }
          } catch (parseError) {
            console.error('❌ Parse error:', parseError)
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(6).trim()
          const data = JSON.parse(jsonStr)
          if (data.type === 'html') {
            setGeneratedCode({ html: data.content, css: null, js: null })
            setCurrentCode(data.content)
          }
        } catch {
          // ignore
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate. Please try again.')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }
  
  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================
  
  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || loading) return
    
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input || `[Uploaded ${uploadedFiles.length} file(s)]`,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput('')
    setLoading(true)
    
    try {
      const isIteration = currentCode !== null
      
      if (isIteration) {
        const formData = new FormData()
        formData.append('message', userInput)
        formData.append('currentCode', currentCode)
        formData.append('projectId', projectId || '')
        formData.append('conversationHistory', JSON.stringify(messages.slice(-5)))
        
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
        
        const response = await fetch('/api/chat/iterate', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        if (response.ok) {
          const assistantMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: uploadedFiles.length > 0 
              ? 'I analyzed your files and updated the code. Check the preview!' 
              : 'Updated! Check the preview on the right.',
            timestamp: new Date()
          }
          
          setMessages(prev => [...prev, assistantMessage])
          setCurrentCode(data.code)
          setGeneratedCode({ html: data.code, css: null, js: null })
          setUploadedFiles([])
        } else {
          throw new Error(data.error || 'Failed to iterate')
        }
      } else {
        const result = await handleGenerate(userInput)
        
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }
        
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: "Great! I've created your site. Check the preview!",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        
        if (!projectName) {
          setProjectName(userInput.slice(0, 50) || 'New Project')
        }
      }
    } catch (error: unknown) {
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  
  // ============================================================================
  // FILE HANDLING
  // ============================================================================
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setUploadedFiles(prev => [...prev, ...filesArray])
      
      const fileMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: `📎 Uploaded: ${filesArray.map(f => f.name).join(', ')}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fileMessage])
    }
  }
  
  // Removed unused function handleTemplateSelect
  
  // ============================================================================
  // PROJECT ACTIONS
  // ============================================================================
  
  const sanitizeCode = (code: string) => {
    if (!code) return code
    let clean = code
    clean = clean.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    clean = clean.replace(/<header[^>]*class="[^"]*buildflow[^"]*"[^>]*>[\s\S]*?<\/header>/gi, '')
    return clean
  }
  
  const handleSaveProject = async () => {
    if (!currentCode || !projectName.trim()) {
      toast.error('Please generate code and provide a project name')
      return
    }
    
    setIsSaving(true)
    try {
      const url = projectId ? `/api/projects/${projectId}` : '/api/projects'
      const method = projectId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          code: sanitizeCode(currentCode),
          type: 'landing-page',
          description: prompt.slice(0, 200)
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (!projectId) {
          setProjectId(data.id)
        }
        toast.success('Project saved!')
      } else {
        throw new Error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save project')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDownload = () => {
    if (!currentCode) {
      toast.error('No code to download')
      return
    }
    
    const sanitized = sanitizeCode(currentCode)
    const blob = new Blob([sanitized], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'project'}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded!')
  }
  
  const handlePublish = async () => {
    if (!currentCode || !projectId) {
      toast.error('Please save your project first')
      return
    }
    
    setIsPublishing(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sanitizeCode(currentCode) })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Published!')
        if (data.url) {
          window.open(data.url, '_blank')
        }
      } else {
        throw new Error(data.error || 'Failed to publish')
      }
    } catch {
      toast.error('Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }
  
  const handleGitHub = () => {
    if (!projectId) {
      toast.error('Please save your project first')
      return
    }
    router.push(`/projects/${projectId}/github`)
  }
  
  const handleVercel = () => {
    if (!projectId) {
      toast.error('Please save your project first')
      return
    }
    router.push(`/projects/${projectId}/deploy`)
  }
  
  // Removed unused variables categories and filteredTemplates
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">Dashboard</span>
            </button>
            <div className="border-l border-gray-300 dark:border-gray-600 h-6 hidden sm:block"></div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project Name"
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-32 sm:w-48"
            />
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2">
            {currentCode && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sanitizeCode(currentCode))
                    toast.success('Code copied!')
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Code className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleGitHub}
                  className="px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </button>
                <button
                  onClick={handleVercel}
                  className="px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-900 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Vercel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            
            <PromptGuide />
            
            <button
              onClick={() => setShowAssistant(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Help</span>
            </button>
          </div>
          
          {/* Mobile Menu - Show key actions only */}
          <div className="flex lg:hidden items-center gap-2">
            {currentCode && (
              <button
                onClick={handleSaveProject}
                disabled={isSaving}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                Generating your website...
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                {Math.round(generationProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-300 ease-out animate-pulse"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Validation Score */}
        {validation && (
          <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-600 dark:text-gray-300">Code Quality:</span>
            <span className={`font-semibold ${
              (validation.validationScore ?? 0) >= 80 ? 'text-green-600' :
              (validation.validationScore ?? 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {(validation.validationScore ?? 0)}/100
            </span>
            {validation.errors && validation.errors.length > 0 && (
              <span className="text-red-600">• {validation.errors.length} issues</span>
            )}
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - Expandable */}
        <div 
          className="flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300"
          style={{ width: `${chatWidth}%` }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">💬</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Start Building with AI
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                  Describe what you want to build
                </p>
                <div className="mb-4">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Examples:</div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 mb-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200">A simple landing page for a bakery</div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200">A full-featured SaaS dashboard with user authentication, analytics charts, and a responsive sidebar</div>
                </div>
                
                {/* URL Parse Option */}
                <div className="max-w-md mx-auto">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Or paste a website URL to clone..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    />
                    <button
                      onClick={handleParseUrl}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Parse
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 sm:p-4 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                      : msg.role === 'system'
                      ? 'bg-blue-50 dark:bg-blue-900 text-gray-800 dark:text-gray-100 border border-blue-200 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-md'
                  }`}
                >
                  <p className="text-sm sm:text-base whitespace-pre-wrap">{msg.content}</p>
                  <MessageTimestamp timestamp={msg.timestamp} />
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-800 relative mt-2" style={{zIndex: 50}}>
            {uploadedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedFiles.map((file, i) => (
                  <span
                    key={i}
                    className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-2"
                  >
                    {file.type.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {file.name.slice(0, 20)}
                    <button
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-purple-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Describe what you want to build..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.xls,.xlsx,.ppt,.pptx"
            />
            
            <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                Attach files
              </button>
              {currentCode && (
                <button
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  Regenerate
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-purple-500 cursor-col-resize hidden md:block"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = chatWidth
            
            const handleMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX
              const newWidth = Math.max(20, Math.min(80, startWidth + (delta / window.innerWidth) * 100))
              setChatWidth(newWidth)
            }
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
        
        {/* Preview Panel */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              Preview
            </h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {showPreview ? '🙈 Hide' : '👁️ Show'}
            </button>
          </div>
          
          <div className="flex-1 p-3 sm:p-6 overflow-hidden">
            {generatedCode.html && showPreview ? (
              <div className="w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <ErrorBoundary>
                  <PreviewFrame
                    html={generatedCode.html}
                    css={generatedCode.css}
                    js={generatedCode.js}
                    onRegenerate={() => { /* TODO: implement regenerate logic */ }}
                  />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <div className="text-5xl sm:text-6xl mb-4">🎨</div>
                  <p className="text-base sm:text-lg mb-2 font-medium">No preview yet</p>
                  <p className="text-xs sm:text-sm text-gray-500">Start chatting to generate your project</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Prompt Assistant Modal */}
      {showAssistant && (
        <PromptAssistant
          isOpen={showAssistant}
          onClose={() => setShowAssistant(false)}
          onUsePrompt={(newPrompt) => {
            setPrompt(newPrompt)
            setInput(newPrompt)
            setShowAssistant(false)
          }}
        />
      )}
    </div>
  )
}