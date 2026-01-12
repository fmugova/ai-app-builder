'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function SignInClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'
  const error = searchParams?.get('error')
  
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorToken: '',
  })

  useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        CredentialsSignin: 'Invalid email or password',
        OAuthSignin: 'Error signing in with OAuth',
        OAuthCallback: 'Error with OAuth callback',
        default: 'An error occurred during sign in',
      }
      toast.error(errorMessages[error] || errorMessages.default)
    }
  }, [error])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)

    try {
      // First check if 2FA is required (only if not already showing 2FA)
      if (!show2FA) {
        const check2FAResponse = await fetch('/api/auth/check-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const check2FAData = await check2FAResponse.json()

        if (check2FAData.error) {
          toast.error(check2FAData.error)
          setLoading(false)
          return
        }

        // Check if email needs verification - let user proceed to see the error from NextAuth
        if (check2FAData.emailVerified === false) {
          // Continue to NextAuth which will handle the verification error
        }

        if (check2FAData.requires2FA) {
          setShow2FA(true)
          toast('Please enter your 2FA code', { icon: '🔐' })
          setLoading(false)
          return
        }
      }

      // If 2FA is shown, validate the token
      if (show2FA && !formData.twoFactorToken) {
        toast.error('Please enter your 2FA code')
        setLoading(false)
        return
      }

      // Proceed with sign in
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        twoFactorToken: formData.twoFactorToken || undefined,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes('Invalid 2FA')) {
          toast.error('Invalid 2FA code. Please try again.')
          setFormData({ ...formData, twoFactorToken: '' })
        } else if (result.error.includes('locked')) {
          toast.error(result.error)
          setShow2FA(false)
        } else {
          toast.error('Invalid email or password')
          setShow2FA(false)
        }
      } else {
        toast.success('Welcome back!', {
          duration: 2000,
          id: 'signin-welcome',
        })
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          success: { duration: 3000 },
          error: { duration: 4000 },
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-4xl">🚀</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                BuildFlow
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-6">Welcome back</h1>
            <p className="text-gray-600 mt-2">Sign in to continue building</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {show2FA && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Two-Factor Authentication Code
                  </label>
                  <input
                    type="text"
                    name="twoFactorToken"
                    value={formData.twoFactorToken}
                    onChange={handleChange}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-center text-2xl tracking-widest font-mono"
                    autoComplete="off"
                    autoFocus
                  />
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Enter the code from your authenticator app or use a backup code
                  </p>
                </div>
              )}

              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-sm text-purple-600 hover:text-purple-700">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* OAuth options disabled for now */}

            <p className="text-center text-gray-600 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-purple-600 hover:text-purple-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
