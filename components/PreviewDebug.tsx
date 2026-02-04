// components/PreviewDebug.tsx
// Temporary diagnostic component to debug blank preview

'use client'

import { useEffect, useState, useMemo } from 'react'

interface PreviewDebugProps {
  html: string
  css?: string
  js?: string
}

export default function PreviewDebug({ html, css, js }: PreviewDebugProps) {

  const diagnostics = useMemo(() => {
    const inlineStyleMatches = html?.match(/style\s*=\s*["'][^"']*["']/g) || []
    return {
      hasHtml: !!html,
      htmlLength: html?.length || 0,
      hasCss: !!css,
      cssLength: css?.length || 0,
      hasJs: !!js,
      jsLength: js?.length || 0,
      hasInlineStyles: inlineStyleMatches.length > 0,
      inlineStyleCount: inlineStyleMatches.length,
      preview: html?.substring(0, 200) || 'No HTML'
    }
  }, [html, css, js])

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-4 max-h-96 overflow-auto">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        🔍 Preview Diagnostics
      </h3>

      {/* HTML Status */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded border">
        <h4 className="font-semibold mb-2">HTML</h4>
        <div className="space-y-1 text-sm">
          <div>
            Status: {diagnostics.hasHtml ? 
              <span className="text-green-600">✅ Present</span> : 
              <span className="text-red-600">❌ Missing</span>
            }
          </div>
          <div>Length: {diagnostics.htmlLength} characters</div>
          {diagnostics.hasInlineStyles && (
            <div className="text-orange-600">
              ⚠️ {diagnostics.inlineStyleCount} inline styles detected
            </div>
          )}
          {diagnostics.htmlLength > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600">
                Show first 200 characters
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                {diagnostics.preview}
              </pre>
            </details>
          )}
        </div>
      </div>

      {/* CSS Status */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded border">
        <h4 className="font-semibold mb-2">CSS</h4>
        <div className="space-y-1 text-sm">
          <div>
            Status: {diagnostics.hasCss ? 
              <span className="text-green-600">✅ Present</span> : 
              <span className="text-gray-500">⚪ None</span>
            }
          </div>
          <div>Length: {diagnostics.cssLength} characters</div>
        </div>
      </div>

      {/* JavaScript Status */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded border">
        <h4 className="font-semibold mb-2">JavaScript</h4>
        <div className="space-y-1 text-sm">
          <div>
            Status: {diagnostics.hasJs ? 
              <span className="text-green-600">✅ Present</span> : 
              <span className="text-gray-500">⚪ None</span>
            }
          </div>
          <div>Length: {diagnostics.jsLength} characters</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Recommendations
        </h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          {!diagnostics.hasHtml && (
            <li>❌ No HTML detected - Preview will be blank</li>
          )}
          {diagnostics.htmlLength < 50 && diagnostics.hasHtml && (
            <li>⚠️ HTML is very short - May not render properly</li>
          )}
          {diagnostics.hasInlineStyles && (
            <li>⚠️ Inline styles detected - Use extractInlineStyles utility</li>
          )}
          {diagnostics.hasHtml && diagnostics.htmlLength > 50 && !diagnostics.hasInlineStyles && (
            <li>✅ HTML looks good - Preview should work</li>
          )}
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border">
        <h4 className="font-semibold mb-2">🔧 Quick Actions</h4>
        <div className="space-y-2">
          <button
            onClick={() => {
              console.log('HTML:', html)
              console.log('CSS:', css)
              console.log('JS:', js)
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Log to Console
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(html || '')
              alert('HTML copied to clipboard')
            }}
            className="ml-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Copy HTML
          </button>
        </div>
      </div>
    </div>
  )
}

// Usage in your page:
// 
// import PreviewDebug from '@/components/PreviewDebug'
// 
// <PreviewDebug 
//   html={generatedCode.html} 
//   css={generatedCode.css} 
//   js={generatedCode.js} 
// />