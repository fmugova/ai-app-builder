'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { templates, getTemplatesByCategory } from '@/lib/templates'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function ChatBuilderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
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

  // Get filtered templates
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : getTemplatesByCategory(selectedCategory)

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.category))]

  // Detect URLs in input and fetch content
  const detectAndFetchUrls = async (text: string): Promise<string> => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = text.match(urlRegex)
    
    if (!urls || urls.length === 0) return text
    
    let enhancedPrompt = text
    
    for (const url of urls) {
      try {
        const response = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        
        if (response.ok) {
          const data = await response.json()
          enhancedPrompt += `\n\n--- Content from ${url} ---\n${data.content.substring(0, 5000)}`
        }
      } catch (error) {
        console.error(`Failed to fetch ${url}:`, error)
      }
    }
    
    return enhancedPrompt
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

  const handleSave = async () => {
    if (!currentCode) {
      alert('No code to save. Generate a site first!')
      return
    }

    setSaving(true)

    try {
      if (projectId) {
        // Update existing project
        // If code still contains SITE_ID_PLACEHOLDER, replace it with projectId
        let codeToSave = currentCode;
        if (currentCode.includes('SITE_ID_PLACEHOLDER')) {
          codeToSave = currentCode.replace('SITE_ID_PLACEHOLDER', projectId);
          setCurrentCode(codeToSave);
        }

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: codeToSave,
            name: projectName
          })
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('Save error:', data)
          throw new Error(data.error || data.message || 'Failed to save project')
        }

        alert('✅ Project saved as draft!')
        console.log('Project updated:', data)
      } else {
        // Create new project
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName || 'Chat Builder Project',
            description: `Created with Chat Builder on ${new Date().toLocaleDateString()}`,
            code: currentCode, // Code with SITE_ID_PLACEHOLDER
            type: 'landing-page'
          })
        })

        const data = await response.json()
        const newProjectId = data.project?.id || data.id

        // ✅ INJECT SITE ID HERE:
        const codeWithSiteId = currentCode.replace(
          'SITE_ID_PLACEHOLDER',
          newProjectId
        )

        // Update project with injected code
        await fetch(`/api/projects/${newProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: codeWithSiteId
          })
        })

        setProjectId(newProjectId)
        setCurrentCode(codeWithSiteId)  // ← Update local state
        alert('✅ Project saved!')
        console.log('Project created:', newProjectId)
      }
    } catch (error: any) {
      console.error('Save failed:', error)
      alert(`❌ Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!currentCode) {
      alert('No code to publish. Generate a site first!')
      return
    }

    setPublishing(true)

    try {
      // If no projectId, create project first
      if (!projectId) {
        const createResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName || 'Chat Builder Project',
            description: `Created with Chat Builder on ${new Date().toLocaleDateString()}`,
            code: currentCode,
            type: 'landing-page',
            published: true
          })
        })

        const createData = await createResponse.json()

        if (!createResponse.ok) {
          console.error('Create error:', createData)
          throw new Error(createData.error || createData.message || 'Failed to create project')
        }

        const newProjectId = createData.project?.id || createData.id
        if (!newProjectId) {
          throw new Error('No project ID in response')
        }

        setProjectId(newProjectId)
        alert('🚀 Project published successfully!')
        console.log('Project created and published:', newProjectId)
        router.push('/dashboard')
        return
      }

      // Update existing project and publish
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          name: projectName,
          published: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Publish error:', data)
        throw new Error(data.error || data.message || 'Failed to publish project')
      }

      alert('🚀 Project published successfully!')
      console.log('Project published:', projectId)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Publish failed:', error)
      alert(`❌ Failed to publish: ${error.message}`)
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
    
    router.push(`/builder?project=${projectId}#export`)
  }

  const handleDeployToVercel = async () => {
    if (!projectId) {
      alert('Please save your project first!')
      return
    }
    
    router.push(`/builder?project=${projectId}#deploy`)
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat Section */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
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
      <div className="w-1/2 flex flex-col bg-gray-50">
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
                <button
                  onClick={handleExportToGitHub}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                  title="Export to GitHub"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
                <button
                  onClick={handleDeployToVercel}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
                  title="Deploy to Vercel"
                >
                  ▲ Vercel
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-4 relative">
          {currentCode ? (
            <iframe
              srcDoc={currentCode}
              className="w-full h-full bg-white rounded-lg shadow-lg border border-gray-200"
              title="Preview"
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