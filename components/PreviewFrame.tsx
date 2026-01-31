'use client'

import { useEffect, useRef, useState } from 'react'

interface ValidationError {
  message?: string
  [key: string]: unknown
}

interface ValidationResult {
  validationPassed?: boolean
  passed?: boolean
  errors?: ValidationError[]
  [key: string]: unknown
}

interface PreviewFrameProps {
  html: string | null
  css?: string | null
  js?: string | null
  validation?: ValidationResult
  onRegenerate?: () => void
}

export default function PreviewFrame({ 
  html, 
  css, 
  js, 
  validation, 
  onRegenerate 
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // ✅ FIX: Only update if there's actually an error to clear
    if (error) {
      setError(null)
    }
  }, [html]) // Remove error from dependencies to avoid infinite loop

  useEffect(() => {
    if (!iframeRef.current || !html) return

    try {
      const iframe = iframeRef.current
      
      // ✅ Use srcdoc for safer rendering
      iframe.srcdoc = html
      
    } catch (err) {
      console.error('Preview error:', err)
      setError(err instanceof Error ? err.message : 'Failed to render preview')
    }

  }, [html])

  if (!html) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-3">🎨</div>
          <p className="font-semibold text-lg">No preview available</p>
          <p className="text-sm mt-1 text-gray-500">Generate code to see the preview</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600 bg-red-50">
        <div className="text-center p-6">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="font-semibold text-lg mb-2">Preview Error</p>
          <p className="text-sm text-red-700">{error}</p>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              🔄 Regenerate
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      />
      
      {validation && !validation.validationPassed && validation.passed === false && (
        <div className="absolute top-4 right-4 bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-xl max-w-sm z-10">
          <p className="text-sm text-red-900 font-semibold mb-2">
            ⚠️ Validation Issues
          </p>
          {validation.errors?.length > 0 && (
            <ul className="text-xs text-red-800 space-y-1 mb-3">
              {validation.errors.slice(0, 3).map((err: ValidationError, i: number) => (
                <li key={i} className="font-medium">• {err.message || String(err)}</li>
              ))}
            </ul>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="w-full px-3 py-2 bg-red-600 text-white rounded font-medium text-sm hover:bg-red-700 transition"
            >
              🔄 Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  )
}
