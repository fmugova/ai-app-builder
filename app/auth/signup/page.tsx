import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import AuthForm from '@/components/AuthForm'

export default function SignUp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="w-10 h-10 text-purple-600" />
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              BuildFlow
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Start building with AI in seconds</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <AuthForm mode="signup" />
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-purple-600 hover:underline">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-purple-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}