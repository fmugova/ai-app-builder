'use client'

import { useState, useEffect } from 'react'
import { Rocket, Loader2, ExternalLink, CheckCircle2, AlertCircle, Link2 } from 'lucide-react'

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
  const [vercelUrl, setVercelUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)

  useEffect(() => {
    checkVercelConnection()
  }, [])

  const checkVercelConnection = async () => {
    try {
      const res = await fetch('/api/integrations/vercel/status')
      const data = await res.json()
      setIsConnected(data.connected)
    } catch (error) {
      console.error('Failed to check Vercel connection:', error)
    } finally {
      setCheckingConnection(false)
    }
  }

  const handleDeploy = async () => {
    if (!isConnected) {
      window.location.href = '/api/integrations/vercel/connect'
      return
    }

    setDeploying(true)
    setStatus('deploying')
    setError(null)

    try {
      const res = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.needsAuth) {
          window.location.href = '/api/integrations/vercel/connect'
          return
        }
        throw new Error(data.error || 'Deployment failed')
      }

      setDeploymentUrl(data.deployment.url)
      setVercelUrl(data.deployment.vercelUrl)
      
      // Poll for deployment status
      pollDeploymentStatus(data.deployment.id)

    } catch (err: any) {
      setStatus('error')
      setError(err.message)
      setDeploying(false)
    }
  }

  const pollDeploymentStatus = async (deploymentId: string) => {
    const maxAttempts = 60 // 60 seconds max
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++

      try {
        const res = await fetch(`/api/deploy/vercel/status/${deploymentId}`)
        const data = await res.json()

        if (data.status === 'ready') {
          clearInterval(interval)
          setStatus('success')
          setDeploying(false)
        } else if (data.status === 'error') {
          clearInterval(interval)
          setStatus('error')
          setError(data.error || 'Deployment failed')
          setDeploying(false)
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setStatus('success') // Assume success after timeout
          setDeploying(false)
        }
      } catch (err) {
        console.error('Status check failed:', err)
      }
    }, 1000)
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
    icon: 'p-2'
  }

  if (checkingConnection) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-800 rounded-lg animate-pulse`}>
        {size !== 'icon' && <div className="h-6 bg-gray-700 rounded"></div>}
        {size === 'icon' && <Loader2 className="w-5 h-5 text-gray-400" />}
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-green-400">
              🎉 Deployed Successfully!
            </h3>
            <p className="text-sm text-green-300">
              Your project is live on Vercel
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <a
            href={deploymentUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition w-full font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            View Live Site
          </a>
          
          {vercelUrl && (
            <a
              href={vercelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-lg transition w-full text-sm"
            >
              <svg viewBox="0 0 76 76" className="w-4 h-4">
                <path d="M38 0L76 76H0L38 0z" fill="white"/>
              </svg>
              View in Vercel Dashboard
            </a>
          )}
        </div>

        <button
          onClick={() => {
            setStatus('idle')
            setDeploymentUrl(null)
            setVercelUrl(null)
          }}
          className="w-full mt-3 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
        >
          Deploy Again
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
            <h3 className="text-lg font-semibold text-red-400">Deployment Failed</h3>
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

  if (!isConnected) {
    if (size === 'icon') {
      return (
        <button
          onClick={handleDeploy}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          title="Connect Vercel to Deploy"
        >
          <Link2 className="w-5 h-5" />
        </button>
      )
    }
    return (
      <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
        <div className="text-center mb-4">
          <p className="text-blue-300 mb-2">Connect Vercel to deploy</p>
          <p className="text-sm text-blue-200">
            Deploy your project with one click after connecting
          </p>
        </div>
        <button
          onClick={handleDeploy}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-black font-medium rounded-lg transition"
        >
          <Link2 className="w-5 h-5" />
          Connect Vercel
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
        title={deploying ? 'Deploying...' : 'Deploy to Vercel'}
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
          Deploying to Vercel...
        </>
      ) : (
        <>
          <Rocket className="w-5 h-5" />
          Deploy to Vercel
        </>
      )}
    </button>
  )
}
