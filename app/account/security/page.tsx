'use client'

import { useEffect, useState } from 'react'
import { Smartphone, Monitor, Tablet, MapPin, Clock, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'

interface ActiveSession {
  id: string
  sessionToken: string
  deviceType: string
  deviceName: string
  ipAddress: string
  location: string | null
  lastActive: Date
  createdAt: Date
  expiresAt: Date
  isCurrent: boolean
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/user/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Revoke this session? The device will be logged out.')) {
      return
    }

    setIsRevoking(sessionId)
    try {
      await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      await fetchSessions()
    } catch (error) {
      console.error('Failed to revoke session:', error)
      alert('Failed to revoke session')
    } finally {
      setIsRevoking(null)
    }
  }

  const revokeAllSessions = async () => {
    if (!confirm('Sign out all other devices? You will remain logged in on this device.')) {
      return
    }

    setIsRevoking('all')
    try {
      const response = await fetch('/api/user/sessions', {
        method: 'POST',
      })
      const data = await response.json()
      alert(data.message || 'Sessions revoked successfully')
      await fetchSessions()
    } catch (error) {
      console.error('Failed to revoke sessions:', error)
      alert('Failed to revoke sessions')
    } finally {
      setIsRevoking(null)
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />
      case 'tablet':
        return <Tablet className="w-5 h-5" />
      default:
        return <Monitor className="w-5 h-5" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Active Sessions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your active sessions and signed-in devices
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={revokeAllSessions}
            disabled={isRevoking === 'all'}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRevoking === 'all' && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign Out All Devices
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`border rounded-lg p-4 transition-colors ${
                session.isCurrent
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {session.deviceName}
                      {session.isCurrent && (
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400 font-normal">
                          (Current Session)
                        </span>
                      )}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {session.location || session.ipAddress}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Last active: {new Date(session.lastActive).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    disabled={isRevoking === session.id}
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRevoking === session.id && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <Link
          href="/account/security/2fa"
          className="block p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Add an extra layer of security to your account by requiring a verification code in addition to your password.
              </p>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Configure 2FA →
              </span>
            </div>
          </div>
        </Link>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Security Tip
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            If you see a session you don&apos;t recognize, revoke it immediately and change your password.
          </p>
        </div>
      </div>
    </div>
  )
}
