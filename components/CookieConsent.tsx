'use client'

import { useState, useEffect } from 'react'
import { hasConsented, setConsentLevel, type ConsentLevel } from '@/lib/consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasConsented()) setVisible(true)
  }, [])

  if (!visible) return null

  function accept(level: ConsentLevel) {
    setConsentLevel(level)
    setVisible(false)
    // Reload so analytics scripts that checked consent at init can pick up the change
    if (level === 'all') window.location.reload()
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-gray-900 border-t border-gray-700 shadow-2xl"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
        <div className="flex-1 text-sm text-gray-300">
          <p className="font-semibold text-white mb-1">Cookie Settings</p>
          <p>
            We use essential cookies to keep the service running and optional analytics
            cookies (PostHog, Google Analytics) to improve your experience. You choose
            what we collect.{' '}
            <a href="/privacy" className="underline text-indigo-400 hover:text-indigo-300">
              Privacy Policy
            </a>
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => accept('essential')}
            className="px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={() => accept('all')}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
