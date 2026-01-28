"use client"

import { useState } from 'react'

export default function ResendVerificationEmail({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleResend = async () => {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send verification email.')
        setStatus('error')
      }
    } catch (err) {
      setError('Failed to send verification email.')
      setStatus('error')
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleResend}
        disabled={status === 'loading' || status === 'sent'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending...' : status === 'sent' ? 'Verification Sent!' : 'Resend Verification Email'}
      </button>
      {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
      {status === 'sent' && <div className="text-green-600 mt-2 text-sm">Check your inbox for a new verification link.</div>}
    </div>
  )
}
