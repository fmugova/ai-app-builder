'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function UnifiedBuilderPage() {
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
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || loading) return

    // Add user message
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
      // Determine if this is initial generation or iteration
      const isIteration = currentCode !== null

      if (isIteration) {
        // ITERATION: Modify existing code
        const formData = new FormData()
        formData.append('message', input)
        formData.append('currentCode', currentCode)
        formData.append('projectId', projectId || '')
        formData.append('conversationHistory', JSON.stringify(messages.slice(-5)))
        formData.append('urls', JSON.stringify(urls))
        
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
        // INITIAL GENERATION: Create new site
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: input,
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

          // Create project
          const projectResponse = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: input.slice(0, 50) || 'New Project',
              code: data.code,
              type: 'landing-page'
            })
          })

          if (projectResponse.ok) {
            const projectData = await projectResponse.json()
            setProjectId(projectData.id)
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
      
      // Add message about uploaded files
      const fileMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `📎 Uploaded: ${filesArray.map(f => f.name).join(', ')}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fileMessage])
    }
  }

  const handlePublish = () => {
    if (projectId) {
      router.push(`/dashboard`)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat Section */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold">BuildFlow AI</h1>
          <p className="text-sm text-gray-600">
            {currentCode ? 'Chat to iterate on your site' : 'Chat to build your site'}
          </p>
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

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
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

          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                currentCode
                  ? "Tell me what to change, or upload files..."
                  : "What do you want to build?"
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Thinking...' : currentCode ? 'Update' : 'Generate'}
            </button>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".html,.js,.jsx,.tsx,.css,.zip"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                disabled={loading}
              >
                📎 Upload broken code
              </button>
              <span className="text-gray-400">•</span>
              <button className="text-gray-600 hover:text-blue-600 transition-colors">
                🔗 Add URL
              </button>
            </div>
            {currentCode && (
              <button
                onClick={handlePublish}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ✓ Save & Publish →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-1/2 flex flex-col bg-gray-50">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold">Live Preview</h2>
          {projectId && (
            <p className="text-sm text-gray-600">Project ID: {projectId}</p>
          )}
        </div>
        
        <div className="flex-1 p-4">
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}