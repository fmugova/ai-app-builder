import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import AuthForm from '@/components/AuthForm'

export default function SignIn() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="w-10 h-10 text-purple-600" />
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI App Builder
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to continue building</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <AuthForm mode="signin" />
        </div>
      </div>
    </div>
  )
}