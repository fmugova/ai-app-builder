'use client'

import { useState, useEffect } from 'react'
import { Check, ExternalLink, Link2, Unlink, Loader2 } from 'lucide-react'

export default function VercelConnectButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [vercelData, setVercelData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/integrations/vercel/status')
      const data = await res.json()
      setIsConnected(data.connected)
      setVercelData(data.connection)
    } catch (error) {
      console.error('Failed to check connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/integrations/vercel/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect from Vercel? You won\'t be able to deploy until you reconnect.')) {
      return
    }

    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/vercel/disconnect', { 
        method: 'POST' 
      })
      
      if (res.ok) {
        setIsConnected(false)
        setVercelData(null)
      } else {
        alert('Failed to disconnect. Please try again.')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert('Failed to disconnect. Please try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-800 h-32 rounded-lg border border-gray-700"></div>
    )
  }

  if (isConnected) {
    return (
      <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Connected to Vercel</h3>
              <p className="text-sm text-green-300">
                {vercelData?.username || vercelData?.email || 'Connected'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition"
          >
            {disconnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unlink className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>

        <div className="bg-green-950/50 rounded-lg p-4 border border-green-800">
          <p className="text-sm text-green-200 flex items-center gap-2">
            <Check className="w-4 h-4" />
            You can now deploy projects to Vercel with one click!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 76 76" className="w-8 h-8">
            <path d="M38 0L76 76H0L38 0z" fill="white"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            Deploy to Vercel
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Connect your Vercel account to deploy your BuildFlow projects with one click. 
            Get instant live URLs with automatic SSL and global CDN.
          </p>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-blue-300 mb-2">✨ What you'll get:</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• One-click deployments</li>
          <li>• Automatic SSL certificates</li>
          <li>• Global CDN (fast worldwide)</li>
          <li>• Custom domains (optional)</li>
          <li>• Instant previews</li>
        </ul>
      </div>

      <button
        onClick={handleConnect}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-gray-100 text-black font-semibold rounded-lg transition shadow-lg hover:shadow-xl"
      >
        <Link2 className="w-5 h-5" />
        Connect Vercel Account
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        You'll be redirected to Vercel to authorize BuildFlow
      </p>
    </div>
  )
}
