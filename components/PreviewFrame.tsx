// components/PreviewFrame.tsx
// FIXED - Always show "Show Details" button when there are errors

'use client'

import { useEffect, useRef, useState } from 'react'
import type { ValidationResult } from '@/lib/types/validation'

interface PreviewFrameProps {
  html: string | null
  css: string | null
  js: string | null
  validation?: ValidationResult
  onRegenerate: () => void
}

export default function PreviewFrame({
  html,
  css,
  js,
  validation,
  onRegenerate,
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!html || !iframeRef.current) return

    const iframe = iframeRef.current
    let didCancel = false

    const renderPreview = async () => {
      try {
        if (error && !didCancel) setError(null)

        let fullHtml = html

        if (css && !html.includes('<style')) {
          const styleTag = `<style>${css}</style>`
          fullHtml = fullHtml.replace('</head>', `${styleTag}</head>`)
        }

        if (js && !html.includes('<script')) {
          const scriptTag = `<script>${js}</script>`
          fullHtml = fullHtml.replace('</body>', `${scriptTag}</body>`)
        }

        iframe.srcdoc = fullHtml

        const handleLoad = () => {
          if (!didCancel) setIsReady(true)
        }

        const handleError = () => {
          if (!didCancel) setError('Failed to render preview')
        }

        iframe.addEventListener('load', handleLoad, { once: true })
        iframe.addEventListener('error', handleError, { once: true })

      } catch (err) {
        if (!didCancel) {
          setError(err instanceof Error ? err.message : 'Failed to render preview')
        }
      }
    }

    renderPreview()

    return () => {
      didCancel = true
      setIsReady(false)
    }
  }, [html, css, js, error])

  if (!html) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-3">🎨</div>
          <p className="text-base font-medium">No preview available</p>
          <p className="text-sm mt-1">Generate code to see preview</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 dark:bg-red-900/20 p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Preview Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={onRegenerate}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🔄 Try Regenerating
          </button>
        </div>
      </div>
    )
  }

  // ✅ Count total issues (errors + warnings)
  const errorCount = validation?.errors?.length || 0
  const warningCount = validation?.warnings?.length || 0
  const totalIssues = errorCount + warningCount
  const hasIssues = totalIssues > 0

  return (
    <div className="relative h-full w-full bg-white dark:bg-gray-900">
      {/* Validation Banner */}
      {validation && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div
            className={`px-4 py-2.5 flex items-center justify-between border-b ${
              (validation.validationScore ?? 0) >= 80
                ? 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800'
                : (validation.validationScore ?? 0) >= 60
                ? 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-100 dark:border-yellow-800'
                : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold">
                Code Quality: {(validation.validationScore ?? 0)}/100
              </span>
              
              {/* ✅ Always show issue count and button if there are ANY issues */}
              {hasIssues && (
                <>
                  <span className="text-sm opacity-75">
                    • {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="text-sm font-medium underline hover:no-underline flex items-center gap-1"
                  >
                    {showErrors ? '▼' : '▶'} {showErrors ? 'Hide' : 'Show'} Details
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={onRegenerate}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                (validation.validationScore ?? 0) >= 80
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : (validation.validationScore ?? 0) >= 60
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              🔄 Regenerate
            </button>
          </div>

          {/* Error Details Panel */}
          {showErrors && hasIssues && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
              <div className="p-4 space-y-3">
                {/* Errors */}
                {errorCount > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                      <span className="text-lg">🔴</span>
                      Errors ({errorCount})
                    </h4>
                    <div className="space-y-2">
                      {validation.errors?.map((err, i) => (
                        <div
                          key={`error-${i}`}
                          className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        >
                          <span className="text-red-600 dark:text-red-400 font-bold min-w-[24px]">
                            {i + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-red-900 dark:text-red-100 font-medium break-words">
                              {err.message}
                            </p>
                            {err.line && (
                              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                Line {err.line}
                              </p>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 shrink-0">
                            {err.severity || 'error'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {warningCount > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      Warnings ({warningCount})
                    </h4>
                    <div className="space-y-2">
                      {validation.warnings?.map((warning, i) => (
                        <div
                          key={`warning-${i}`}
                          className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                        >
                          <span className="text-yellow-600 dark:text-yellow-400 font-bold min-w-[24px]">
                            {i + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-yellow-900 dark:text-yellow-100 font-medium break-words">
                              {warning.message}
                            </p>
                            {warning.line && (
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                Line {warning.line}
                              </p>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 shrink-0">
                            {warning.severity || 'warning'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 z-20 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Loading preview...
            </p>
          </div>
        </div>
      )}

      {/* Preview iframe */}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Preview"
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        style={{
          marginTop: validation 
            ? (showErrors && hasIssues ? '240px' : '52px') 
            : '0',
        }}
      />
    </div>
  )
}