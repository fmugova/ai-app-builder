"use client"

import { useState } from 'react'
import ResendVerificationEmail from '@/components/ResendVerificationEmail'

export default function VerifyEmailPage() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleVerify = async () => {
    setStatus('verifying')
    setError('')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setError(data.error || 'Verification failed.')
        setStatus('error')
      }
    } catch (err) {
      setError('Verification failed.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold mb-4 text-center">Verify Your Email</h1>
        <p className="text-gray-600 mb-6 text-center">Paste your verification token below or click the link in your email.</p>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Verification token"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4"
        />
        <button
          onClick={handleVerify}
          disabled={status === 'verifying' || !token}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 mb-4"
        >
          {status === 'verifying' ? 'Verifying...' : 'Verify Email'}
        </button>
        {status === 'success' && <div className="text-green-600 text-center mb-2">Email verified! You can now sign in.</div>}
        {status === 'error' && <div className="text-red-600 text-center mb-2">{error}</div>}
        <div className="mt-6 text-center text-gray-500 text-sm">
          Didn&apos;t get the email? <ResendVerificationEmail email="" />
        </div>
      </div>
    </div>
  )
}
