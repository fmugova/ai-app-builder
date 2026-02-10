/**
 * Dual Preview System for BuildFlow AI
 * 
 * - Simple HTML: Instant iframe preview (current system)
 * - Full-Stack Next.js: Deploy to Vercel, show preview link
 * 
 * Location: components/DualPreviewSystem.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react'

interface DualPreviewProps {
  project: {
    id: string
    type: 'html' | 'nextjs'
    html?: string
    files?: Array<{ path: string; content: string }>
  }
}

export default function DualPreviewSystem({ project }: DualPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'deployed' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Auto-deploy for Next.js projects
  useEffect(() => {
    if (project.type === 'nextjs' && deployStatus === 'idle') {
      deployToVercel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.type])

  async function deployToVercel() {
    setDeployStatus('deploying')
    setError(null)

    try {
      const response = await fetch('/api/preview/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          files: project.files,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      setPreviewUrl(data.url)
      setDeployStatus('deployed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setDeployStatus('error')
    }
  }

  // Simple HTML preview
  if (project.type === 'html') {
    return (
      <div className="h-full">
        <div className="bg-green-50 border-b border-green-200 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-800 font-medium">
              Live Preview
            </span>
          </div>
          <span className="text-xs text-green-600">Instant</span>
        </div>

        <iframe
          className="w-full h-[calc(100%-48px)] border-0"
          sandbox="allow-scripts allow-forms"
          srcDoc={project.html}
          title="Preview"
        />
      </div>
    )
  }

  // Full-Stack Next.js preview
  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className={`border-b p-3 ${
        deployStatus === 'deployed' ? 'bg-green-50 border-green-200' :
        deployStatus === 'deploying' ? 'bg-blue-50 border-blue-200' :
        deployStatus === 'error' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {deployStatus === 'deploying' && (
              <>
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-800">
                  Deploying to Vercel...
                </span>
              </>
            )}
            {deployStatus === 'deployed' && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-800">
                  Deployed Successfully
                </span>
              </>
            )}
            {deployStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Deployment Failed
                </span>
              </>
            )}
          </div>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        {deployStatus === 'deploying' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Deploying your app...
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This usually takes 20-40 seconds
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>✓ Building Next.js app</p>
              <p>✓ Installing dependencies</p>
              <p className="animate-pulse">⏳ Deploying to Vercel...</p>
            </div>
          </div>
        )}

        {deployStatus === 'deployed' && previewUrl && (
          <div className="w-full h-full">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Full-Stack Preview"
            />
          </div>
        )}

        {deployStatus === 'error' && (
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Deployment Failed
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {error || 'Unable to deploy preview. Please try again.'}
            </p>
            <button
              onClick={deployToVercel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry Deployment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
