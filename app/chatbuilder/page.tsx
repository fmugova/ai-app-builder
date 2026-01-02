'use client'

import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { templates, getTemplatesByCategory } from '@/lib/templates'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function ChatBuilderPage() {
  const toast = useToast()
  const { data: session } = useSession()
  const router = useRouter()

  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: "Hi! I'm BuildFlow AI. Tell me what you want to build, or upload broken code from Replit/Bubble and I'll fix it!",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Load project from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('project')
    if (projectId) {
      loadProject(projectId)
    }
  }, [])

  const loadProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()

      if (data.code) {
        setProjectId(projectId)
        setProjectName(data.name || 'Untitled Project')
        setCurrentCode(data.code)

        const loadMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `✅ Loaded: ${data.name}. Ready to iterate!`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, loadMessage])
      }
    } catch (err) {
      console.error('Failed to load project:', err)
      alert('Failed to load project')
    }
  }
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Get all categories from templates
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  // Get filtered templates
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : getTemplatesByCategory(selectedCategory);

  // Helper: Detect and fetch URLs from input
  async function detectAndFetchUrls(text: string): Promise<string> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    // You can add logic here to fetch and process URLs if needed
    // For now, just return the original text
    return text;
  }

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || loading) return

    // Detect and fetch URLs if present
    let enhancedInput = input
    if (input.includes('http')) {
      const urlMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: '🔍 Detected URL in your message. Fetching content...',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, urlMessage])
      
      enhancedInput = await detectAndFetchUrls(input)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || `[Uploaded ${uploadedFiles.length} file(s)]`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const isIteration = currentCode !== null

      if (isIteration) {
        // ITERATION
        const formData = new FormData()
        formData.append('message', enhancedInput)
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
            id: Date.now().toString(),
            role: 'assistant',
            content: uploadedFiles.length > 0 
              ? 'I analyzed your files and fixed the issues. Check the preview!' 
              : 'Updated! Check the preview on the right.',
            timestamp: new Date()
          }

          setMessages(prev => [...prev, assistantMessage])
          setCurrentCode(data.code)
          setUploadedFiles([])
        } else {
          throw new Error(data.error || 'Failed to iterate')
        }
      } else {
        // INITIAL GENERATION
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: enhancedInput,
            type: 'landing-page'
          })
        })

        const data = await response.json()

        if (response.ok) {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Great! I've created your site. You can see it in the preview. Want me to make any changes?",
            timestamp: new Date()
          }

          setMessages(prev => [...prev, assistantMessage])
          setCurrentCode(data.code)
          
          // Set default project name from prompt
          if (!projectName) {
            setProjectName(input.slice(0, 50) || 'New Project')
          }
        } else {
          throw new Error(data.error || 'Failed to generate')
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setUploadedFiles(prev => [...prev, ...filesArray])
      
      const fileMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `📎 Uploaded: ${filesArray.map(f => f.name).join(', ')}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fileMessage])
    }
  }

  // Helper: sanitize generated code before saving/updating
  const sanitizeCode = (code: string) => {
    if (!code) return code
    let clean = code
    // Remove BuildFlow navigation that got captured
    clean = clean.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    clean = clean.replace(/<header[^>]*class="[^"]*buildflow[^"]*"[^>]*>[\s\S]*?<\/header>/gi, '')
    // Remove these specific menu items that are appearing
    const menuItems = ['Dashboard', 'Analytics', 'Submissions', 'Download', 'GitHub', 'Vercel']
    menuItems.forEach(item => {
      // Only remove if it's in a list/menu context (has emoji or is in a nav structure)
      const pattern = new RegExp(`<[^>]*>\\s*[📊📈📋📥🐙▲]?\\s*${item}\\s*<\\/[^>]*>`, 'gi')
      clean = clean.replace(pattern, '')
    })
    // Remove feedback buttons
    clean = clean.replace(/<[^>]*feedback[^>]*>[\s\S]*?<\/[^ 0]*>/gi, '')
    return clean.trim()
  }

  const handleSave = async () => {
    if (!currentCode) {
      toast.toast({
        variant: 'destructive',
        description: 'No code to save. Generate a site first!'
      })
      return
    }
    setSaving(true)
    const cleanCode = sanitizeCode(currentCode)
    try {
      if (projectId) {
        // UPDATE existing project
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            code: cleanCode
          })
        })
        if (res.ok) {
          toast.toast({
            variant: 'default',
            description: 'Project updated!'
          })
        } else {
          const error = await res.text()
          console.error('Save failed:', error)
          toast.toast({
            variant: 'destructive',
            description: 'Failed to save'
          })
        }
      } else {
        // CREATE new project
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            code: cleanCode,
            type: 'website'
          })
        })
        if (res.ok) {
          const data = await res.json()
          window.history.pushState({}, '', `/chatbuilder?project=${data.id}`)
          setProjectId(data.id)
          toast.toast({
            variant: 'default',
            description: 'Project created!'
          })
        } else {
          const error = await res.text()
          console.error('Save failed:', error)
          toast.toast({
            variant: 'destructive',
            description: 'Failed to save'
          })
        }
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.toast({
        variant: 'destructive',
        description: 'Error saving project'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!currentCode) {
      toast.toast({
        variant: 'destructive',
        description: 'No code to publish. Generate a site first!'
      })
      return
    }
    setPublishing(true)
    const cleanCode = sanitizeCode(currentCode)
    try {
      if (!projectId) {
        // CREATE and publish new project
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            code: cleanCode,
            type: 'website',
            published: true
          })
        })
        if (res.ok) {
          const data = await res.json()
          window.history.pushState({}, '', `/chatbuilder?project=${data.id}`)
          setProjectId(data.id)
          toast.toast({
            variant: 'default',
            description: 'Project published!'
          })
          router.push('/dashboard')
        } else {
          const error = await res.text()
          console.error('Publish failed:', error)
          toast.toast({
            variant: 'destructive',
            description: 'Failed to publish'
          })
        }
      } else {
        // UPDATE and publish existing project
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            code: cleanCode,
            published: true
          })
        })
        if (res.ok) {
          toast.toast({
            variant: 'default',
            description: 'Project published!'
          })
          router.push('/dashboard')
        } else {
          const error = await res.text()
          console.error('Publish failed:', error)
          toast.toast({
            variant: 'destructive',
            description: 'Failed to publish'
          })
        }
      }
    } catch (error) {
      console.error('Publish error:', error)
      toast.toast({
        variant: 'destructive',
        description: 'Error publishing project'
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleDownload = () => {
    if (!currentCode) return
    
    const blob = new Blob([currentCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'website'}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportToGitHub = async () => {
    if (!projectId) {
      alert('Please save your project first!')
      return
    }
    try {
      const response = await fetch('/api/export/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          repoName: projectName,
          code: currentCode
        })
      })
      if (response.ok) {
        const data = await response.json()
        window.open(data.repoUrl, '_blank')
      }
    } catch (error) {
      console.error('GitHub export error:', error)
      alert('Failed to export to GitHub')
    }
  }

  const handleDeployToVercel = async () => {
    if (!projectId) {
      alert('Please save your project first!')
      return
    }
    try {
      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          projectName: projectName,
          code: currentCode
        })
      })
      if (response.ok) {
        const data = await response.json()
        window.open(data.deploymentUrl, '_blank')
      }
    } catch (error) {
      console.error('Vercel deploy error:', error)
      alert('Failed to deploy to Vercel')
    }
  }

  const handleLoadTemplate = (template: typeof templates[0]) => {
    setShowTemplates(false)
    setCurrentCode(template.code)
    setProjectName(template.name)
    const templateMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Loaded template: ${template.name}. You can now customize it by chatting with me!`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, templateMessage])
  }

  // Clean code for existing projects
  const cleanExistingProject = async () => {
    if (!projectId || !currentCode) return
    const cleanCode = sanitizeCode(currentCode)
    setCurrentCode(cleanCode)
    await handleSave()
  }

  // Helper function for category icons
  function getCategoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'landing-page': return '🚀'
      case 'dashboard': return '📊'
      case 'blog': return '📝'
      case 'portfolio': return '💼'
      case 'e-commerce': return '🛒'
      case 'saas': return '⚡'
      case 'marketing': return '📈'
      case 'startup': return '🎯'
      default: return '📄'
    }
  }

  // Helper: wrap preview code in full HTML document
  function getPreviewHTML(code: string) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          ${code}
        </body>
      </html>
    `
  }

  return (
  <div className="flex flex-col md:flex-row h-screen bg-gray-50">
    
    {/* ===== ADD THIS ENTIRE BLOCK ===== */}
    {/* Mobile Header with Menu */}
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="p-2 rounded-lg hover:bg-gray-100"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <h1 className="text-lg font-bold">BuildFlow AI</h1>
      
      {currentCode && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg disabled:opacity-50"
          >
            💾
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50"
          >
            🚀
          </button>
        </div>
      )}
    </div>

    {/* Mobile Menu Overlay */}
    {showMobileMenu && (
      <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
        <div className="bg-white w-64 h-full p-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Menu</h2>
            <button onClick={() => setShowMobileMenu(false)} className="text-2xl">×</button>
          </div>
          <nav className="space-y-2">
            <button
              onClick={() => { router.push('/dashboard'); setShowMobileMenu(false) }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => { router.push('/dashboard/analytics'); setShowMobileMenu(false) }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg"
            >
              📈 Analytics
            </button>
            <button
              onClick={() => { router.push('/dashboard/submissions'); setShowMobileMenu(false) }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg"
            >
              📋 Submissions
            </button>
            {currentCode && (
              <>
                <button
                  onClick={() => { handleDownload(); setShowMobileMenu(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => { handleExportToGitHub(); setShowMobileMenu(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg"
                >
                  🐙 GitHub
                </button>
                <button
                  onClick={() => { handleDeployToVercel(); setShowMobileMenu(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg"
                >
                  ▲ Vercel
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    )}
   
      {/* Chat Section */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col border-b md:border-b-0 md:border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="hidden md:block px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">BuildFlow AI Chat</h1>
              <p className="text-sm text-gray-600">
                {currentCode ? 'Chat to iterate on your site' : 'Chat to build your site'}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
          
          {/* Project Name Input */}
          {currentCode && (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-purple-100 text-purple-900 border-2 border-purple-300'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1 opacity-60">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Buttons MOVED TO TOP, mb-16 to clear feedback widget */}
        <div className="p-4 border-t border-gray-200 bg-white mb-16">
          {/* Action Buttons Row - NOW AT TOP */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".html,.js,.jsx,.tsx,.css,.zip,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
                disabled={loading}
              >
                📎 Upload Files
              </button>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-medium shadow-sm"
                disabled={loading}
              >
                📋 Templates
              </button>
            </div>
            
            {/* Separate Save & Publish Buttons */}
            {currentCode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? '💾 Saving...' : '💾 Save Draft'}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-sm"
                  title="Save and publish to live site"
                >
                  {publishing ? '🚀 Publishing...' : '🚀 Publish'}
                </button>
                <button
                  onClick={cleanExistingProject}
                  disabled={saving || !projectId}
                  className="flex items-center gap-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-sm"
                  title="Clean navigation and menu from code"
                >
                  🧹 Clean Code
                </button>
              </div>
            )}
          </div>

          {/* Uploaded files preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                  <span>📎 {file.name}</span>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Larger Textarea Input */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                currentCode
                  ? "Tell me what to change, upload files, or paste URLs..."
                  : "What do you want to build? (Paste URLs or upload files)"
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px] max-h-[200px]"
              disabled={loading}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium h-[60px]"
            >
              {loading ? 'Thinking...' : currentCode ? 'Update' : 'Generate'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            💡 Tip: Press Enter to send, Shift+Enter for new line. Paste URLs to analyze websites.
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-gray-50">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Live Preview</h2>
              {projectId && (
                <p className="text-sm text-gray-600">ID: {projectId}</p>
              )}
            </div>
            
            {/* Action Buttons */}
            {currentCode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  title="Download HTML"
                >
                  ⬇️ Download
                </button>
                <a
                  href="https://github.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition"
                  title="Export to GitHub"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <a
                  href="https://vercel.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition"
                  title="Deploy to Vercel"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 22.525H0l12-21.05 12 21.05z"/>
                  </svg>
                  Vercel
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-4 relative">
          {currentCode ? (
            <iframe
              srcDoc={getPreviewHTML(currentCode)}
              className="w-full h-full bg-white rounded-lg shadow-lg border border-gray-200"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-lg font-semibold">Your site will appear here</p>
                <p className="text-sm mt-2">Start by telling me what you want to build</p>
                <div className="mt-6 text-left max-w-md mx-auto space-y-2 text-sm">
                  <p className="font-semibold text-gray-600">Examples:</p>
                  <p className="text-gray-500">• "Create a coffee shop website"</p>
                  <p className="text-gray-500">• "Build a gym landing page"</p>
                  <p className="text-gray-500">• Upload broken Replit code to fix</p>
                  <p className="text-gray-500">• Paste website URL to analyze</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Start from a Template</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? '🎨 All' : `${getCategoryIcon(category)} ${category}`}
                </button>
              ))}
            </div>
            
            {/* Template Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleLoadTemplate(template)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-left group"
                >
                  <div className="text-4xl mb-3">{getCategoryIcon(template.category)}</div>
                  <h3 className="font-bold mb-2 group-hover:text-purple-600">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.tags?.slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No templates found in this category</p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  View All Templates
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}