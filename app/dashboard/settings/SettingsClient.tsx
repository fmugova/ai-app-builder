'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  bio?: string | null
  autoSave: boolean
  notifications: boolean
  theme: string
  role: string
  subscriptionTier?: string
  subscriptionStatus?: string
  generationsUsed?: number
  generationsLimit?: number
  projectsThisMonth?: number
  projectsLimit?: number
  githubUsername?: string | null
  createdAt: string
}

interface SettingsClientProps {
  user: User
}

export default function SettingsClient({ user: initialUser }: SettingsClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [user, setUser] = useState(initialUser)
  
  const [name, setName] = useState(user.name)
  // const [bio, setBio] = useState(user.bio || '')
  const [autoSave, setAutoSave] = useState(user.autoSave)
  const [notifications, setNotifications] = useState(user.notifications)
  const [theme, setTheme] = useState(user.theme)

  // Fetch latest settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true)
      try {
        const res = await fetch('/api/user/settings')
        if (res.ok) {
          const data = await res.json()
          setUser(data)
          setName(data.name)
          setAutoSave(data.autoSave)
          setNotifications(data.notifications)
          setTheme(data.theme)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        setIsFetching(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          autoSave,
          notifications,
          theme,
        })
      })

      if (res.ok) {
        alert('✅ Settings saved successfully!')
        router.refresh()
      } else {
        const error = await res.json()
        alert(`❌ Failed to save: ${error.error}`)
      }
    } catch {
      alert('❌ Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <Link
              href="/dashboard"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {isFetching ? (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Auto-save</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically save your work while editing
                  </p>
                </div>
                <button
                  onClick={() => setAutoSave(!autoSave)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    autoSave ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive email notifications about your projects
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    notifications ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>

          {/* Subscription Info (if available) */}
          {user.subscriptionTier && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Subscription</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">{user.subscriptionTier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">{user.subscriptionStatus}</p>
                </div>
                {user.generationsLimit && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Generations</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user.generationsUsed} / {user.generationsLimit}
                    </p>
                  </div>
                )}
                {user.projectsLimit && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Projects This Month</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user.projectsThisMonth} / {user.projectsLimit}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/billing"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition text-sm font-medium"
                >
                  Manage Subscription →
                </Link>
              </div>
            </div>
          )}

          {/* Integrations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Integrations</h2>
            
            <div className="space-y-4">
              {/* GitHub */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">GitHub</h3>
                    {user.githubUsername ? (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Connected as @{user.githubUsername}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Export projects to GitHub repositories
                      </p>
                    )}
                  </div>
                </div>
                {/* GitHub integration */}
                <Link href="/integrations/github">
                  {user.githubUsername ? 'Manage' : 'Connect'}
                </Link>
              </div>

              {/* Vercel */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 19.5h20L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Vercel</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Deploy projects with one click
                    </p>
                  </div>
                </div>
                {/* Vercel integration */}
                <Link href="/integrations/vercel">
                  Configure
                </Link>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account</h2>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">User ID</dt>
                <dd className="font-mono text-sm text-gray-900 dark:text-white mt-1">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="text-sm text-gray-900 dark:text-white mt-1 capitalize">{user.role}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Member Since</dt>
                <dd className="text-sm text-gray-900 dark:text-white mt-1">
                  {new Date(user.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}