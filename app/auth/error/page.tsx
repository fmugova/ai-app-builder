'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration. Please contact support.',
    AccessDenied: 'Access denied. You may not have permission to sign in.',
    Verification: 'The verification link has expired or has already been used.',
    OAuthSignin: 'Error starting the OAuth sign-in flow. Please try again.',
    OAuthCallback: 'Error during the OAuth callback. Please check your OAuth provider settings.',
    OAuthCreateAccount: 'Could not create OAuth account. The email may already be in use.',
    EmailCreateAccount: 'Could not create email account.',
    Callback: 'Error in the OAuth callback handler.',
    OAuthAccountNotLinked: 'This email is already associated with another account. Please sign in with the original provider.',
    EmailSignin: 'Error sending the verification email.',
    CredentialsSignin: 'Invalid email or password. Please check your credentials.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An unexpected error occurred during authentication.',
  }

  const errorMessage = error ? (errorMessages[error] || errorMessages.Default) : errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-purple-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">
            {errorMessage}
          </p>
          {error && (
            <p className="text-red-500 text-xs mt-2">
              Error code: {error}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full text-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full text-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Go Home
          </Link>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          If the problem persists, please{' '}
          <a href="mailto:support@buildflow-ai.app" className="text-purple-600 hover:underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}