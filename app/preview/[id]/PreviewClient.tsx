'use client'

import { useEffect, useState, useRef } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

import type { ValidationMessage } from '@/lib/validator'
interface ValidationResult {
  isComplete: boolean
  hasHtml: boolean
  hasCss: boolean
  hasJs: boolean
  validationScore: number
  validationPassed: boolean
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
  cspViolations: string[]
  passed: boolean
}

interface PreviewFrameProps {
  html: string
  css: string
  js: string
  validation: ValidationResult
}

export default function PreviewFrame({ html, css, js, validation }: PreviewFrameProps) {
  const [iframeError, setIframeError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current) return

    try {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document

      if (!doc) {
        setTimeout(() => setIframeError(true), 0)
        return
      }

      // Build complete HTML document
      const fullHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}</script>
        </body>
        </html>
      `

      doc.open()
      doc.write(fullHTML)
      doc.close()

      setTimeout(() => setIframeError(false), 0)
    } catch (error) {
      console.error('Preview error:', error)
      setTimeout(() => setIframeError(true), 0)
    }
  }, [html, css, js])

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      {/* Validation Status Bar */}
      {(!validation.validationPassed || validation.errors.length > 0) && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Code Quality Issues Detected
              </p>
              {validation.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {validation.errors.slice(0, 3).map((error, i) => (
                    <li key={i} className="text-xs text-yellow-700 flex items-start gap-2">
                      <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{error.message}</span>
                    </li>
                  ))}
                  {validation.errors.length > 3 && (
                    <li className="text-xs text-yellow-600">
                      + {validation.errors.length - 3} more errors
                    </li>
                  )}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {validation.warnings.slice(0, 2).map((warning, i) => (
                    <li key={i} className="text-xs text-yellow-600 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {validation.validationPassed && validation.errors.length === 0 && (
        <div className="bg-green-50 border-b border-green-200 p-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              Code validated successfully
            </span>
            <span className="text-xs text-green-600 ml-auto">
              Score: {validation.validationScore}/100
            </span>
          </div>
        </div>
      )}

      {/* Preview Frame */}
      <div className="flex-1 relative overflow-hidden">
        {iframeError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Preview Error
              </h3>
              <p className="text-gray-600 text-sm">
                Unable to render preview. Please check the console for errors.
              </p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        )}
      </div>
    </div>
  )
}