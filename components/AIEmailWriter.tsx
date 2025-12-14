'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface AIEmailWriterProps {
  onGenerated: (content: { subject: string; body: string }) => void
}

export default function AIEmailWriter({ onGenerated }: AIEmailWriterProps) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('medium')
  const [generating, setGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const generateEmail = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to write about')
      return
    }

    setGenerating(true)

    try {
      const res = await fetch('/api/admin/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone, length })
      })

      if (res.ok) {
        const data = await res.json()
        onGenerated({
          subject: data.subject,
          body: data.body
        })
        toast.success('Email content generated! ✨')
        setShowModal(false)
        setPrompt('')
      } else {
        toast.error('Failed to generate content')
      }
    } catch (error) {
      toast.error('Error generating content')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition flex items-center gap-2 text-white font-medium"
      >
        <span>✨</span>
        <span>AI Writer</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full p-8 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>✨</span> AI Email Writer
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What do you want to write about?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Announce our new AI-powered feature that helps users build apps 10x faster..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tone
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'professional', label: '💼 Professional', desc: 'Formal and authoritative' },
                    { value: 'friendly', label: '😊 Friendly', desc: 'Warm and approachable' },
                    { value: 'exciting', label: '🚀 Exciting', desc: 'Energetic and bold' },
                    { value: 'educational', label: '📚 Educational', desc: 'Informative and clear' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTone(option.value)}
                      className={`p-3 rounded-lg border-2 transition text-left ${
                        tone === option.value
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white text-sm mb-1">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Length
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'short', label: 'Short', desc: '~100 words' },
                    { value: 'medium', label: 'Medium', desc: '~200 words' },
                    { value: 'long', label: 'Long', desc: '~400 words' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLength(option.value)}
                      className={`p-3 rounded-lg border-2 transition ${
                        length === option.value
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white text-sm mb-1">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateEmail}
                disabled={generating || !prompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating with AI...
                  </span>
                ) : (
                  '✨ Generate Email'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}