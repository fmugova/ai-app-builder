'use client'

import { useState, useEffect } from 'react'
import { X, Check, AlertCircle, Loader2, ExternalLink, Database, Cloud } from 'lucide-react'

interface DatabaseSchemaTable {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable?: boolean
  }>
}

interface AutoDeployModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  hasDatabase?: boolean
  databaseSchema?: DatabaseSchemaTable[]
}

type DeploymentStatus = 
  | 'idle'
  | 'deploying'
  | 'provisioning_database'
  | 'deploying_vercel'
  | 'success'
  | 'failed'

export default function AutoDeployModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  hasDatabase = false,
  databaseSchema = [],
}: AutoDeployModalProps) {
  const [status, setStatus] = useState<DeploymentStatus>('idle')
  const [deploymentId, setDeploymentId] = useState<string | null>(null)
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [vercelConnected, setVercelConnected] = useState(false)
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [checkingConnections, setCheckingConnections] = useState(true)

  useEffect(() => {
    if (isOpen) {
      checkIntegrations()
    }
  }, [isOpen])

  useEffect(() => {
    if (deploymentId && status === 'deploying') {
      const interval = setInterval(() => {
        checkDeploymentStatus()
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    }
  }, [deploymentId, status])

  const checkIntegrations = async () => {
    setCheckingConnections(true)
    try {
      const [vercelRes, supabaseRes] = await Promise.all([
        fetch('/api/integrations/vercel/status'),
        fetch('/api/integrations/supabase/status'),
      ])

      const vercelData = await vercelRes.json()
      const supabaseData = await supabaseRes.json()

      setVercelConnected(vercelData.connected)
      setSupabaseConnected(supabaseData.connected)
    } catch (error) {
      console.error('Failed to check integrations:', error)
    } finally {
      setCheckingConnections(false)
    }
  }

  const connectVercel = () => {
    window.location.href = '/api/integrations/vercel/connect'
  }

  const connectSupabase = () => {
    window.location.href = '/api/integrations/supabase/connect'
  }

  const startDeployment = async () => {
    setStatus('deploying')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/deploy/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          includeDatabase: hasDatabase,
          databaseSchema: hasDatabase ? databaseSchema : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requiresVercelAuth) {
          setStatus('failed')
          setErrorMessage('Please connect your Vercel account first')
          return
        }
        throw new Error(data.error || 'Deployment failed')
      }

      setDeploymentId(data.deploymentId)
    } catch (error: unknown) {
      console.error('Deployment error:', error)
      setStatus('failed')
      setErrorMessage(error instanceof Error ? error.message : 'Deployment failed')
    }
  }

  const checkDeploymentStatus = async () => {
    if (!deploymentId) return

    try {
      const response = await fetch(`/api/deploy/auto?deploymentId=${deploymentId}`)
      const data = await response.json()

      if (response.ok && data.deployment) {
        setStatus(data.deployment.status as DeploymentStatus)
        setLogs(data.deployment.logs || '')
        
        if (data.deployment.deploymentUrl) {
          setDeploymentUrl(data.deployment.deploymentUrl)
        }

        if (data.deployment.errorMessage) {
          setErrorMessage(data.deployment.errorMessage)
        }

        // Stop polling if deployment is complete or failed
        if (data.deployment.status === 'success' || data.deployment.status === 'failed') {
          return
        }
      }
    } catch (error) {
      console.error('Failed to check deployment status:', error)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <Check className="w-6 h-6 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      case 'deploying':
      case 'provisioning_database':
      case 'deploying_vercel':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'provisioning_database':
        return 'Setting up your database...'
      case 'deploying_vercel':
        return 'Deploying to Vercel...'
      case 'deploying':
        return 'Starting deployment...'
      case 'success':
        return 'Deployment successful!'
      case 'failed':
        return 'Deployment failed'
      default:
        return 'Ready to deploy'
    }
  }

  const canDeploy = vercelConnected && (!hasDatabase || supabaseConnected)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-purple-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Auto-Deploy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Project: {projectName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deploy your full-stack application to production in one click
            </p>
          </div>

          {/* Integration Status */}
          {checkingConnections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Required Integrations
              </h4>

              {/* Vercel Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <Cloud className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Vercel
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      For hosting your application
                    </div>
                  </div>
                </div>
                {vercelConnected ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                ) : (
                  <button
                    onClick={connectVercel}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Supabase Status (only if database needed) */}
              {hasDatabase && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Supabase
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        For your database
                      </div>
                    </div>
                  </div>
                  {supabaseConnected ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  ) : (
                    <button
                      onClick={connectSupabase}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Connect
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Deployment Status */}
          {status !== 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {getStatusIcon()}
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {getStatusMessage()}
                  </div>
                  {logs && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {logs}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Steps */}
              {status !== 'failed' && (
                <div className="space-y-2">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      status === 'provisioning_database'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : status === 'deploying_vercel' || status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    {status === 'provisioning_database' ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : status === 'deploying_vercel' || status === 'success' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="text-sm text-gray-900 dark:text-white">
                      {hasDatabase ? 'Provision Database' : 'Prepare Files'}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      status === 'deploying_vercel'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    {status === 'deploying_vercel' ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : status === 'success' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="text-sm text-gray-900 dark:text-white">
                      Deploy to Vercel
                    </span>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {status === 'success' && deploymentUrl && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="font-medium text-green-900 dark:text-green-100 mb-2">
                    🎉 Your app is live!
                  </div>
                  <a
                    href={deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-700 dark:text-green-300 hover:underline"
                  >
                    {deploymentUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="font-medium text-red-900 dark:text-red-100 mb-1">
                    Deployment Failed
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {errorMessage}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {status === 'idle' && (
              <>
                <button
                  onClick={startDeployment}
                  disabled={!canDeploy}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    canDeploy
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Deploy Now
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {status === 'success' && (
              <>
                <a
                  href={deploymentUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors text-center"
                >
                  View Live Site
                </a>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Close
                </button>
              </>
            )}

            {status === 'failed' && (
              <>
                <button
                  onClick={() => {
                    setStatus('idle')
                    setErrorMessage(null)
                    setDeploymentId(null)
                  }}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Close
                </button>
              </>
            )}

            {(status === 'deploying' || status === 'provisioning_database' || status === 'deploying_vercel') && (
              <div className="flex-1 text-center text-sm text-gray-600 dark:text-gray-400">
                This may take 3-5 minutes...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
