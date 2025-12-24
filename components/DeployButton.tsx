'use client'

import { useState } from 'react'
import { Rocket, Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'

interface DeployButtonProps {
  projectId: string
  projectName: string
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export default function DeployButton({ 
  projectId, 
  projectName,
  size = 'md'
}: DeployButtonProps) {
  const [deploying, setDeploying] = useState(false)
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle')
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDeploy = async () => {
    setDeploying(true)
    setStatus('deploying')
    setError(null)

    try {
      // Simple publish to BuildFlow hosting
      console.log('🚀 Publishing to BuildFlow...')
      
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Publishing failed')
      }

      console.log('✅ Published successfully:', data.url)
      
      setDeploymentUrl(data.url)
      setStatus('success')
      setDeploying(false)

    } catch (err: any) {
      setStatus('error')
      setError(err.message)
      setDeploying(false)
    }
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
    icon: 'p-2'
  }

  if (status === 'success') {
    return (
      <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-green-400">
              🎉 Published Successfully!
            </h3>
            <p className="text-sm text-green-300">
              Your project is now live
            </p>
          </div>
        </div>
        
        <a
          href={deploymentUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition w-full font-medium"
        >
          <ExternalLink className="w-5 h-5" />
          View Live Site
        </a>

        <button
          onClick={() => {
            setStatus('idle')
            setDeploymentUrl(null)
          }}
          className="w-full mt-3 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
        >
          Publish Again
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-400">Publishing Failed</h3>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={handleDeploy}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (size === 'icon') {
    return (
      <button
        onClick={handleDeploy}
        disabled={deploying}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition disabled:opacity-50"
        title={deploying ? 'Publishing...' : 'Publish to BuildFlow'}
      >
        {deploying ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Rocket className="w-5 h-5" />
        )}
      </button>
    )
  }
  
  return (
    <button
      onClick={handleDeploy}
      disabled={deploying}
      className={`${sizeClasses[size]} flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed w-full font-semibold shadow-lg hover:shadow-xl`}
    >
      {deploying ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Publishing...
        </>
      ) : (
        <>
          <Rocket className="w-5 h-5" />
          Publish Site
        </>
      )}
    </button>
  )
}
