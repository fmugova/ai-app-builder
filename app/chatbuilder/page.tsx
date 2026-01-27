'use client'

import { useState, useRef, useEffect } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { templates, getTemplatesByCategory } from '@/lib/templates'
import dynamic from 'next/dynamic'
import PromptAssistant from '@/components/PromptAssistant'
import PreviewFrame from '@/components/PreviewFrame'
import { HelpCircle } from 'lucide-react'

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

interface ValidationMessage {
  message: string
  line?: number
  column?: number
  type?: 'syntax' | 'structure' | 'completeness'
}

interface ValidationResult {
  validationPassed: boolean
  validationScore: number
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
  passed: boolean
}

interface GenerateResult {
  success: boolean
  error?: string
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
    <span className="block text-xs text-gray-400 mt-1 text-right">{display}</span>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatBuilder() {
  const router = useRouter()
  useSession()
  
  // Message ID generator
  let messageCounter = 0
  const generateMessageId = () => {
    return `${Date.now()}-${++messageCounter}`
  }
  
  // State
  const [prompt, setPrompt] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | undefined>()
  const [projectName, setProjectName] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [includeAuth, setIncludeAuth] = useState(false)
  const [authProvider, setAuthProvider] = useState<'nextauth' | 'supabase' | 'jwt'>('nextauth')
  const [showAssistant, setShowAssistant] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  
  // State for validation
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode>({ 
    html: null, 
    css: null, 
    js: null 
  })
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  
  // ✅ NEW: Progress tracking
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Load project or page from URL parameter
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
  
  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])
  
  // ============================================================================
  // FIXED PROJECT LOADING - Add to your ChatBuilder page.tsx
  // ============================================================================

  const loadProject = async (id: string) => {
    try {
      console.log('🔍 Loading project:', id);
      
      const response = await fetch(`/api/projects/${id}`)
      const data = await response.json();
      
      console.log('📦 Project data received:', {
        id: data.id,
        name: data.name,
        codeLength: data.code?.length || 0,
        htmlLength: data.html?.length || 0,
        htmlCodeLength: data.htmlCode?.length || 0
      });
      
      if (response.ok) {
        setProjectId(data.id);
        setProjectName(data.name);
        
        // ✅ FIX: Try multiple fields to find the code
        const code = data.code || data.html || data.htmlCode || '';
        
        if (!code) {
          console.error('❌ No code found in project!');
          toast.error('Project has no code');
          return;
        }
        
        console.log('✅ Setting code:', code.length, 'chars');
        
        // ✅ FIX: Set BOTH states
        setCurrentCode(code);
        setGeneratedCode({ html: code, css: null, js: null });
        
        toast.success('Project loaded!');
      } else {
        throw new Error(data.error || 'Failed to load project');
      }
    } catch (error) {
      console.error('❌ Load error:', error);
      toast.error('Failed to load project');
    }
  }
  
  const loadPage = async (projectId: string, pageId: string) => {
    try {
      console.log('🔍 Loading page:', pageId, 'from project:', projectId);
      
      const response = await fetch(`/api/projects/${projectId}/pages/${pageId}`)
      const data = await response.json();
      
      console.log('📦 Page data received:', {
        id: data.id,
        name: data.name,
        codeLength: data.code?.length || 0
      });
      
      if (response.ok) {
        setProjectId(projectId);
        setProjectName(data.name);
        
        const code = data.code || '';
        
        if (!code) {
          console.error('❌ No code found in page!');
          toast.error('Page has no code');
          return;
        }
        
        console.log('✅ Setting code:', code.length, 'chars');
        
        // ✅ FIX: Set BOTH states
        setCurrentCode(code);
        setGeneratedCode({ html: code, css: null, js: null });
        
        toast.success('Page loaded!');
      } else {
        throw new Error(data.error || 'Failed to load page');
      }
    } catch (error) {
      console.error('❌ Load error:', error);
      toast.error('Failed to load page');
    }
  }
  
  // ============================================================================
  // CODE GENERATION (UPDATED - AUTO PROJECT HANDLING)
  // ============================================================================

const handleGenerate = async (customPrompt?: string) => {
  const promptToUse = customPrompt || prompt;

  if (!promptToUse.trim()) {
    toast.error('Please enter a prompt');
    return { success: false, error: 'No prompt provided' };
  }

  setIsGenerating(true);
  setGenerationProgress(0);
  setGeneratedCode({ html: null, css: null, js: null });
  setValidation(null);

  try {
    const response = await fetch('/api/chatbot/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptToUse,
        projectId,
        includeAuth,
        authProvider,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedHtml = '';
    let localProjectId = projectId;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          const data = JSON.parse(jsonStr);

          switch (data.type) {
            case 'progress':
              if (typeof data.length === 'number') {
                const progress = Math.min(95, (data.length / 35000) * 100);
                setGenerationProgress(progress);
              }
              break;
            case 'projectCreated':
              if (data.projectId) {
                setProjectId(data.projectId);
                localProjectId = data.projectId;
              }
              break;
            case 'complete':
              if (data.projectId && data.projectId !== projectId) {
                setProjectId(data.projectId);
                localProjectId = data.projectId;
              }
              setGenerationProgress(100);
              break;
            case 'html':
              setGeneratedCode({ html: data.content, css: null, js: null });
              setCurrentCode(data.content);
              break;
            case 'html_chunk':
              accumulatedHtml += data.content;
              if (data.isLast) {
                setGeneratedCode({ html: accumulatedHtml, css: null, js: null });
                setCurrentCode(accumulatedHtml);
              }
              break;
            case 'error':
              toast.error(data.message || 'Generation error');
              setValidation({
                validationPassed: false,
                validationScore: data.validationScore ?? 0,
                errors: data.errors ?? [],
                warnings: [],
                passed: false,
              });
              break;
            default:
              // ignore unknown
              break;
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
        }
      }
    }

    // Handle any remaining data in buffer
    if (buffer.trim().startsWith('data: ')) {
      try {
        const jsonStr = buffer.slice(6).trim();
        const data = JSON.parse(jsonStr);
        if (data.type === 'html') {
          setGeneratedCode({ html: data.content, css: null, js: null });
          setCurrentCode(data.content);
        }
      } catch (e) {
        // ignore
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Generation error:', error);
    toast.error('Failed to generate. Please try again.');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    setIsGenerating(false);
    setGenerationProgress(0);
  }
};
  
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
        // ITERATION MODE - modify existing code
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
        // INITIAL GENERATION MODE
        const result = await handleGenerate(userInput)
        
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }
        
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: "Great! I've created your site. You can see it in the preview. Want me to make any changes?",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Set default project name from prompt
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
  // FILE & TEMPLATE HANDLING
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
  
  const handleTemplateSelect = (template: typeof templates[0]) => {
    setPrompt(template.description)
    setCurrentCode(template.code)
    setGeneratedCode({ html: template.code, css: null, js: null })
    setProjectName(`${template.name} Project`)
    setShowTemplates(false)
    
    const templateMessage: Message = {
      id: generateMessageId(),
      role: 'system',
      content: `✅ Loaded template: ${template.name}. Ready to customize!`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, templateMessage])
    toast.success(`Template "${template.name}" loaded!`)
  }
  
  // ============================================================================
  // PROJECT ACTIONS
  // ============================================================================
  
  const sanitizeCode = (code: string) => {
    if (!code) return code
    let clean = code
    
    // Remove BuildFlow navigation
    clean = clean.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    clean = clean.replace(/<header[^>]*class="[^"]*buildflow[^"]*"[^>]*>[\s\S]*?<\/header>/gi, '')
    
    // Remove menu items
    const menuItems = ['Dashboard', 'Analytics', 'Submissions', 'Download', 'GitHub', 'Vercel']
    menuItems.forEach(item => {
      const pattern = new RegExp(`<[^>]*>\\s*[📊📈📋📥🐙▲]?\\s*${item}\\s*<\\/[^>]*>`, 'gi')
      clean = clean.replace(pattern, '')
    })
    
    // Remove feedback buttons
    clean = clean.replace(/<[^>]*feedback[^>]*>[\s\S]*?<\/[^>]*>/gi, '')
    
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
        toast.success('Project saved successfully!')
      } else {
        throw new Error(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Save error:', error)
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
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
        toast.success('Published successfully!')
        if (data.url) {
          window.open(data.url, '_blank')
        }
      } else {
        throw new Error(data.error || 'Failed to publish')
      }
    } catch (error) {
      console.error('Publish error:', error)
      toast.error('Failed to publish project')
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
  
  // ============================================================================
  // TEMPLATE HELPERS
  // ============================================================================
  
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : getTemplatesByCategory(selectedCategory)
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <div className="border-l border-gray-300 h-6 hidden sm:block"></div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project Name"
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent hidden sm:block"
            />
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              📋 Templates
            </button>
            
            {/* ✅ FIX: Show buttons when currentCode exists */}
            {currentCode && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sanitizeCode(currentCode))
                    toast.success('Code copied!')
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  📋 Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  💾 Download
                </button>
                <button
                  onClick={handleGitHub}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  🐙 GitHub
                </button>
                <button
                  onClick={handleVercel}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  ▲ Vercel
                </button>
                {projectId && (
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {isPublishing ? 'Publishing...' : '🚀 Publish'}
                  </button>
                )}
                <button
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isSaving ? 'Saving...' : '✅ Save'}
                </button>
              </>
            )}
            
            <PromptGuide />
            
            <button
              onClick={() => setShowAssistant(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Help</span>
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* ✅ NEW: Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Generating your website...</span>
              <span className="text-purple-600 font-medium">{Math.round(generationProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Mobile Menu Dropdown - same as before but with currentCode check */}
        {showMobileMenu && (
          <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 space-y-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mb-3"
            />
            <button
              onClick={() => { setShowTemplates(!showTemplates); setShowMobileMenu(false) }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium text-left"
            >
              📋 Templates
            </button>
            {currentCode && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sanitizeCode(currentCode))
                    toast.success('Code copied!')
                    setShowMobileMenu(false)
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium text-left"
                >
                  📋 Copy Code
                </button>
                <button
                  onClick={() => { handleDownload(); setShowMobileMenu(false) }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium text-left"
                >
                  💾 Download
                </button>
                <button
                  onClick={() => { handleGitHub(); setShowMobileMenu(false) }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium text-left"
                >
                  🐙 Export to GitHub
                </button>
                <button
                  onClick={() => { handleVercel(); setShowMobileMenu(false) }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium text-left"
                >
                  ▲ Deploy to Vercel
                </button>
                {projectId && (
                  <button
                    onClick={() => { handlePublish(); setShowMobileMenu(false) }}
                    disabled={isPublishing}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-left"
                  >
                    {isPublishing ? 'Publishing...' : '🚀 Publish Live'}
                  </button>
                )}
                <button
                  onClick={() => { handleSaveProject(); setShowMobileMenu(false) }}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium text-left"
                >
                  {isSaving ? 'Saving...' : '✅ Save Project'}
                </button>
              </>
            )}
            <button
              onClick={() => { setShowAssistant(true); setShowMobileMenu(false) }}
              className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium text-left"
            >
              💡 Help & Prompt Guide
            </button>
          </div>
        )}
        
        {/* Templates Panel */}
        {showTemplates && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-purple-300 transition text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{template.icon}</span>
                    <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition">
                      {template.name}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Auth Options */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeAuth}
              onChange={(e) => setIncludeAuth(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Include Authentication</span>
          </label>
          
          {includeAuth && (
            <select
              value={authProvider}
              onChange={(e) => setAuthProvider(e.target.value as 'nextauth' | 'supabase' | 'jwt')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="nextauth">NextAuth.js</option>
              <option value="supabase">Supabase Auth</option>
              <option value="jwt">JWT</option>
            </select>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Panel */}
        <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Start Building with AI
                </h3>
                <p className="text-gray-600 mb-6">
                  Describe what you want to build, or choose a template
                </p>
                <div className="max-w-md mx-auto text-left space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      💡 <strong>Tip:</strong> Be specific about colors, layout, and features
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      📎 <strong>Upload files:</strong> Share designs, screenshots, or docs
                    </p>
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
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : msg.role === 'system'
                      ? 'bg-blue-50 text-gray-800 border border-blue-200'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  <MessageTimestamp timestamp={msg.timestamp} />
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            {uploadedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedFiles.map((file, i) => (
                  <span
                    key={i}
                    className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    📎 {file.name}
                    <button
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-purple-900 hover:text-purple-700 font-bold"
                    >
                      ✕
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {loading ? '...' : '→'}
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="mt-2 text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              📎 Attach files
            </button>
          </div>
        </div>
        
        {/* Right: Preview Panel */}
        <div className="w-1/2 bg-gray-50 flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showPreview ? '🙈 Hide' : '👁️ Show'}
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-hidden">
            {generatedCode.html && showPreview ? (
              <div className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <PreviewFrame
                  html={generatedCode.html}
                  css={generatedCode.css}
                  js={generatedCode.js}
                  validation={validation}
                  onRegenerate={() => handleGenerate()}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-lg mb-2">No preview yet</p>
                  <p className="text-sm">Start chatting to generate your project</p>
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
      
      {/* ✅ FIX: CSS for visibility and positioning */}
      <style jsx>{`
        /* Chat message visibility fixes */
        .bg-purple-600 {
          background: #7c3aed !important;
          color: white !important;
        }
        
        .text-white {
          color: white !important;
        }
        
        .bg-gray-50.text-gray-900 {
          background: #f9fafb !important;
          color: #111827 !important;
        }
        
        .bg-gray-50 {
          background: #f9fafb !important;
        }
        
        .text-gray-900 {
          color: #111827 !important;
        }
        
        /* Input area - ensure visibility and proper spacing */
        .border-t.border-gray-200.p-4.bg-white {
          padding-bottom: 1rem !important;
          margin-bottom: 60px; /* Space for feedback widget */
        }
        
        /* Textarea styling */
        textarea {
          color: #1f2937 !important;
          background: white !important;
        }
        
        textarea::placeholder {
          color: #9ca3af !important;
        }
        
        /* Input styling */
        input[type="text"],
        input[type="number"] {
          color: #1f2937 !important;
          background: white !important;
        }
        
        input::placeholder {
          color: #9ca3af !important;
        }
        
        /* Ensure all text is readable */
        .text-sm {
          color: inherit;
        }
        
        /* Message text specifically */
        .whitespace-pre-wrap {
          color: inherit !important;
        }
        
        /* Timestamp text */
        .text-gray-400 {
          color: #9ca3af !important;
        }
      `}</style>
    </div>
  )
}