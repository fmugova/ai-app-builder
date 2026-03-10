"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ResendVerificationEmail from '@/components/ResendVerificationEmail'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailParam = searchParams.get('email') ?? ''
  const tokenParam = searchParams.get('token') ?? ''

  const [token, setToken] = useState(tokenParam)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  // Auto-verify if a token arrived via URL (user clicked the email link)
  useEffect(() => {
    if (tokenParam) {
      handleVerify(tokenParam)
    }
  }, [tokenParam])

  const handleVerify = async (t = token) => {
    if (!t) return
    setStatus('verifying')
    setError('')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
        // Redirect to sign-in after a short delay
        setTimeout(() => router.push('/auth/signin?verified=true'), 2000)
      } else {
        setError(data.error || 'Verification failed.')
        setStatus('error')
      }
    } catch {
      setError('Verification failed.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold mb-4 text-center">Verify Your Email</h1>

        {status === 'success' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-700 font-semibold text-lg mb-2">Email verified!</p>
            <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6 text-center">
              {tokenParam
                ? 'Verifying your email…'
                : 'Paste your verification token below or click the link in your email.'}
            </p>

            {status === 'idle' && !tokenParam && (
              <>
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Verification token"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => handleVerify()}
                  disabled={!token}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 mb-4"
                >
                  Verify Email
                </button>
              </>
            )}

            {status === 'verifying' && (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Verifying…</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-red-600 text-center mb-4 text-sm bg-red-50 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 text-center text-gray-500 text-sm">
              Didn&apos;t get the email?
              <ResendVerificationEmail email={emailParam} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
