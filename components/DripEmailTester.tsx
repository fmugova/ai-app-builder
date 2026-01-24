'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function DripEmailTester() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const triggerDripEmails = async () => {
    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/trigger-drip', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger drip emails')
      }

      setResult(data)
      toast.success(`Successfully sent ${String(data.details?.processed || 0)} emails!`)
    } catch (error: any) {
      console.error('Trigger error:', error)
      toast.error(error.message || 'Failed to trigger drip emails')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Drip Email Campaign Tester
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Manually trigger the drip email processor to send scheduled onboarding emails.
      </p>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          📧 Onboarding Email Schedule:
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>• <strong>Day 0:</strong> Welcome email</li>
          <li>• <strong>Day 1:</strong> "Create your first project"</li>
          <li>• <strong>Day 3:</strong> "Customize your design"</li>
          <li>• <strong>Day 7:</strong> "Ready to upgrade?"</li>
          <li>• <strong>Day 14:</strong> "See what Pro users can do"</li>
        </ul>
      </div>

      <button
        onClick={triggerDripEmails}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          'Trigger Drip Emails Now'
        )}
      </button>

      {result && (
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
            ✅ Processing Complete
          </h3>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <p><strong>Emails Processed:</strong> {String(result.details?.processed || 0)}</p>
            {result.details?.details && result.details.details.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold mb-2">Details:</p>
                <div className="bg-white dark:bg-gray-800 rounded p-3 max-h-60 overflow-y-auto">
                  {result.details.details.map((email: any, index: number) => (
                    <div key={index} className="text-xs mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{email.email}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          email.status === 'sent' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {email.status}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        Day {email.day} - {email.type}
                      </div>
                      {email.error && (
                        <div className="text-red-600 dark:text-red-400 mt-1">
                          Error: {email.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
