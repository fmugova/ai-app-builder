'use client'

import { useState } from 'react'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface VerifyEmailNoticeClientProps {
  email: string
  name: string
}

export default function VerifyEmailNoticeClient({ email, name }: VerifyEmailNoticeClientProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleResendEmail = async () => {
    setSending(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send email')
      }
    } catch (_err) {
      setError('Failed to send verification email')
    } finally {
      setSending(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            Hi {name || 'there'}! Please verify your email address to access your account.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">
            <strong>📧 Check your inbox:</strong> {email}
          </p>
          <p className="text-xs text-blue-700">
            We sent a verification link to your email. Click the link to verify your account.
          </p>
        </div>

        {sent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium">Email sent!</p>
              <p className="text-xs text-green-700 mt-1">Check your inbox for the verification link.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={sending || sent}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            {sending ? 'Sending...' : sent ? 'Email Sent!' : 'Resend Verification Email'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-600 mb-2">
            <strong>Why verify your email?</strong>
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Secure your account</li>
            <li>Enable password recovery</li>
            <li>Receive important notifications</li>
          </ul>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Can&apos;t find the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  )
}
