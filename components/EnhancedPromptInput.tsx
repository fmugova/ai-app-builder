"use client"

import { useState } from 'react'
import { Upload, Link as LinkIcon, X, FileText, Image as ImageIcon } from 'lucide-react'

interface EnhancedPromptInputProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function EnhancedPromptInput({ value, onChange, onGenerate, isGenerating }: EnhancedPromptInputProps) {
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const addUrl = () => {
    if (urlInput.trim()) {
      setUrls(prev => [...prev, urlInput.trim()])
      setUrlInput('')
      setShowUrlInput(false)
    }
  }

  const removeUrl = (index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Main Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          What to build? *
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe what you want to create..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
          disabled={isGenerating}
        />
      </div>

      {/* Attachments */}
      {(files.length > 0 || urls.length > 0) && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-blue-400" />
              ) : (
                <FileText className="w-4 h-4 text-green-400" />
              )}
              <span className="flex-1 text-sm text-gray-300 truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}

          {urls.map((url, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <LinkIcon className="w-4 h-4 text-purple-400" />
              <span className="flex-1 text-sm text-gray-300 truncate">{url}</span>
              <button
                onClick={() => removeUrl(index)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL Input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && addUrl()}
          />
          <button
            onClick={addUrl}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowUrlInput(false)
              setUrlInput('')
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <label className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition cursor-pointer flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Upload File</span>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx"
            disabled={isGenerating}
          />
        </label>

        <button
          onClick={() => setShowUrlInput(true)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition flex items-center gap-2"
          disabled={isGenerating || showUrlInput}
        >
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm">Add URL</span>
        </button>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={!value.trim() || isGenerating}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span className="animate-pulse">Generating...</span>
          </span>
        ) : (
          '✨ Generate with AI'
        )}
      </button>
    </div>
  )
}
