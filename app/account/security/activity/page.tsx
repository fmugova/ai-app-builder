'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface SecurityEvent {
  id: string
  type: string
  action: string
  ipAddress: string | null
  userAgent: string | null
  location: string | null
  metadata: Record<string, unknown> | null
  severity: string
  createdAt: Date
}

export default function SecurityActivityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/user/security-events')
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Failed to fetch security events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'warning':
        return <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    }
  }

  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Security Activity</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review your recent security events and account activity
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <Link
          href="/account/security"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Manage Sessions
        </Link>
        <Link
          href="/account"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Account Settings
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">No security events recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`border rounded-lg p-4 transition-colors ${getSeverityColor(
                event.severity
              )}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(event.severity)}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{formatEventType(event.type)}</h3>
                      <p className="text-sm mt-1 capitalize">{event.action}</p>
                    </div>
                    <span className="text-sm">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {(event.ipAddress || event.location) && (
                    <div className="text-sm mt-2 space-y-1">
                      {event.location && (
                        <p>
                          <strong>Location:</strong> {event.location}
                        </p>
                      )}
                      {event.ipAddress && (
                        <p>
                          <strong>IP:</strong> {event.ipAddress}
                        </p>
                      )}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                            View Details
                          </summary>
                          <pre className="mt-2 text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Security events are kept for your review and are automatically
            cleaned up after 90 days. If you notice suspicious activity, change your password
            immediately.
          </p>
        </div>
      )}
    </div>
  )
}
