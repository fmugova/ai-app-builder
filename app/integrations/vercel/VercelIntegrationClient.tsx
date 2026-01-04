'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function VercelIntegrationClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [token, setToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [showToken, setShowToken] = useState(false)

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/integrations/vercel')
        if (res.ok) {
          const data = await res.json()
          setHasToken(!!data.token)
          setProjectName(data.projectName || '')
          setTeamId(data.teamId || '')
        }
      } catch (error) {
        console.error('Failed to fetch Vercel settings:', error)
      } finally {
        setIsFetching(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    if (!token.trim()) {
      alert('Please enter a Vercel API token')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/integrations/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          projectName: projectName.trim(),
          teamId: teamId.trim(),
        })
      })

      if (res.ok) {
        alert('✅ Vercel integration saved successfully!')
        setHasToken(true)
        setToken('')
        setShowToken(false)
        router.refresh()
      } else {
        const error = await res.json()
        alert(`❌ Failed to save: ${error.error}`)
      }
    } catch (error) {
      alert('❌ Failed to save Vercel integration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Vercel integration?\n\nYou can reconnect anytime.')) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/integrations/vercel', {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Vercel integration disconnected')
        setHasToken(false)
        setProjectName('')
        setTeamId('')
        router.refresh()
      } else {
        alert('❌ Failed to disconnect')
      }
    } catch (error) {
      alert('❌ Failed to disconnect Vercel integration')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vercel Integration</h1>
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
        {hasToken ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">
                  Connected to Vercel
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your Vercel account is connected. You can now deploy projects with one click.
                </p>
                {projectName && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    Project: <strong>{projectName}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              🚀 Connect Your Vercel Account
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Deploy your BuildFlow projects to Vercel with automatic SSL, global CDN, and instant previews.
            </p>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Configuration
          </h2>
          
          <div className="space-y-4">
            {/* API Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vercel API Token {!hasToken && <span className="text-red-500">*</span>}
              </label>
              {hasToken && !showToken ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                    ••••••••••••••••••••••••••••
                  </div>
                  <button
                    onClick={() => setShowToken(true)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition text-sm font-medium"
                  >
                    Update
                  </button>
                </div>
              ) : (
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="vercel_xxx..."
                />
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Get your token from{' '}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  vercel.com/account/tokens
                </a>
              </p>
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vercel Project Name (optional)
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="my-project"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Default project name for deployments
              </p>
            </div>

            {/* Team ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team ID (optional)
              </label>
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="team_xxx..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Only needed if deploying to a team
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {showToken || !hasToken ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
                >
                  {isLoading ? 'Saving...' : hasToken ? 'Update Token' : 'Save Token'}
                </button>
                {showToken && (
                  <button
                    onClick={() => {
                      setShowToken(false)
                      setToken('')
                    }}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            ✨ What you'll get:
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">One-click deployments</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Deploy your projects instantly from BuildFlow</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Automatic SSL certificates</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Free HTTPS for all your deployments</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Global CDN</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lightning-fast loading worldwide</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Custom domains</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use your own domain names (optional)</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Disconnect */}
        {hasToken && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Disconnect Vercel
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will remove your Vercel API token. You can reconnect anytime.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
            >
              {isLoading ? 'Disconnecting...' : 'Disconnect Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}