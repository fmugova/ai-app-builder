'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface GitHubIntegrationClientProps {
  initialUsername?: string | null
  initialConnected: boolean
}

export default function GitHubIntegrationClient({ 
  initialUsername, 
  initialConnected 
}: GitHubIntegrationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(initialConnected)
  const [username, setUsername] = useState(initialUsername)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Handle OAuth callback
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      alert('✅ GitHub account connected successfully!')
      router.replace('/integrations/github')
      router.refresh()
    } else if (error) {
      let errorMessage = 'Failed to connect GitHub account'
      switch (error) {
        case 'no_code':
          errorMessage = 'Authorization code not received'
          break
        case 'invalid_state':
          errorMessage = 'Invalid state parameter. Please try again.'
          break
        case 'config':
          errorMessage = 'GitHub OAuth is not properly configured'
          break
        case 'token_exchange':
          errorMessage = 'Failed to exchange authorization code for token'
          break
        case 'user_fetch':
          errorMessage = 'Failed to fetch GitHub user information'
          break
      }
      alert(`❌ ${errorMessage}`)
      router.replace('/integrations/github')
    }
  }, [searchParams, router])

  const handleConnect = () => {
    window.location.href = '/api/integrations/github/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub?\n\nYou can reconnect anytime.')) {
      return
    }

    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/github/disconnect', {
        method: 'POST'
      })

      if (res.ok) {
        alert('✅ GitHub account disconnected')
        setIsConnected(false)
        setUsername(null)
        router.refresh()
      } else {
        alert('❌ Failed to disconnect GitHub account')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      alert('❌ Failed to disconnect GitHub account')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Integration</h1>
            <Link
              href="/dashboard/settings"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition text-sm"
            >
              ← Back to Settings
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Connection Status */}
        {isConnected ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">
                  Connected to GitHub
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Signed in as <strong>@{username}</strong>
                </p>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Connect to GitHub
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Export your BuildFlow projects to GitHub repositories
                </p>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="w-full px-6 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              Connect GitHub Account
            </button>
          </div>
        )}

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            What you can do with GitHub:
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Export projects as repositories</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Save your code to GitHub with one click</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Version control</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track changes and collaborate with others</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">GitHub Pages deployment</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Host static sites directly from GitHub</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
            📝 Setup Required
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
            To enable GitHub integration, you need to configure OAuth credentials:
          </p>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
            <li>Create a GitHub OAuth App at <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="underline">github.com/settings/developers</a></li>
            <li>Set callback URL to: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/github/callback</code></li>
            <li>Add <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">GITHUB_CLIENT_ID</code> and <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">GITHUB_CLIENT_SECRET</code> to your environment variables</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
