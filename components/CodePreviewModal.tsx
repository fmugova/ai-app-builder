'use client'

import { useState } from 'react'
import { X, Copy, Check, Maximize2, Minimize2, Code } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CodePreviewModalProps {
  code: string
  projectId?: string
  isOpen?: boolean
  onClose?: () => void
  onEdit?: (code: string) => void
}

export default function CodePreviewModal({
  code,
  projectId,
  isOpen = true,
  onClose,
  onEdit,
}: CodePreviewModalProps) {
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCode, setShowCode] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy code')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-${projectId || 'preview'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Code downloaded!')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full' : 'max-w-6xl w-full max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Preview & Code</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">{showCode ? 'Show Preview' : 'Show Code'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2"
            >
              <span className="hidden sm:inline">Download</span>
              <span className="sm:hidden">📥</span>
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-gray-600" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={onClose || (() => window.location.reload())}
              className="p-2 hover:bg-red-100 rounded-lg text-gray-600 hover:text-red-600"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showCode ? (
            <div className="h-full overflow-auto p-4 bg-gray-900">
              <pre className="text-sm text-green-400 font-mono">
                <code>{code}</code>
              </pre>
            </div>
          ) : (
            <iframe
              srcDoc={code}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {code.length.toLocaleString()} characters
            </p>
            {onEdit && (
              <button
                onClick={() => onEdit(code)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
              >
                Edit Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}