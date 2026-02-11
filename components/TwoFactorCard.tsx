'use client'

import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react'
import Link from 'next/link'

type TwoFactorStatus = {
  twoFactorEnabled: boolean
  backupCodesRemaining: number
}

export default function TwoFactorCard() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa/status')
      if (res.ok) {
        const data = await res.json()
        setStatus({
          twoFactorEnabled: data.twoFactorEnabled,
          backupCodesRemaining: data.backupCodesRemaining
        })
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!status) {
    return null
  }

  return (
    <Link
      href="/account/security/2fa"
      className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${
          status.twoFactorEnabled 
            ? 'bg-green-100 dark:bg-green-900/30' 
            : 'bg-blue-100 dark:bg-blue-900/30'
        }`}>
          {status.twoFactorEnabled ? (
            <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Two-Factor Authentication
          </h3>
          {status.twoFactorEnabled ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                  Enabled
                </span>
                {status.backupCodesRemaining} backup codes remaining
              </p>
              {status.backupCodesRemaining < 3 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  Low on backup codes
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Add an extra layer of security to your account
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                Not Enabled
              </span>
            </div>
          )}
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-3">
            {status.twoFactorEnabled ? 'Manage 2FA →' : 'Enable 2FA →'}
          </p>
        </div>
      </div>
    </Link>
  )
}
