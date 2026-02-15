'use client'

import { useEffect, useState } from 'react'

export default function MaintenancePage() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Logo / icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Scheduled Maintenance
          </h1>
          <p className="text-gray-400 text-lg">
            BuildFlow AI is undergoing maintenance{dots}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">We&apos;ll be back shortly</p>
              <p className="text-gray-400 text-sm mt-0.5">
                Our team is working to restore service as quickly as possible.
                All your projects and data are safe.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Status updates</p>
              <p className="text-gray-400 text-sm mt-0.5">
                Follow{' '}
                <a
                  href="https://twitter.com/buildflowai"
                  className="text-blue-400 hover:text-blue-300 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @buildflowai
                </a>
                {' '}for real-time updates.
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} BuildFlow AI
        </p>
      </div>
    </div>
  )
}
