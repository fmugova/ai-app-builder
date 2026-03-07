'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-purple-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500 text-sm mt-2">
            An unexpected error occurred. It&apos;s been reported and we&apos;re looking into it.
          </p>
        </div>

        {error.digest && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-center">
            <p className="text-gray-500 text-xs font-mono">Error ID: {error.digest}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full text-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="block w-full text-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Still having issues?{' '}
          <a href="mailto:support@buildflow-ai.app" className="text-purple-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
