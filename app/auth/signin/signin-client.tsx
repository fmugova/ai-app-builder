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
      // Proceed with sign in using next-auth
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        twoFactorToken: formData.twoFactorToken || undefined,
        redirect: false,
      })

      if (result?.error) {
        // Try to parse error as JSON for custom error name
        let errorName = ''
        try {
          const parsed = JSON.parse(result.error)
          errorName = parsed.name || ''
        } catch {
          // fallback to string includes
        }

        if (errorName === 'EMAIL_NOT_VERIFIED' || result.error.includes('verify your email')) {
          toast.error('You must verify your email before signing in.')
          setTimeout(() => {
            router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
          }, 1000)
        } else if (errorName === 'TWO_FACTOR_ONBOARDING_REQUIRED' || result.error.includes('Two-factor authentication setup required')) {
          toast.error('You must set up 2FA before accessing your account.')
          setTimeout(() => {
            router.push('/account/security/2fa?onboarding=1')
          }, 1000)
        } else if (errorName === '2FA_REQUIRED' || result.error.includes('2FA_REQUIRED')) {
          // Server confirmed user has 2FA — show the token input and re-submit
          setShow2FA(true)
          setLoading(false)
          return
        } else if (result.error.includes('Invalid 2FA')) {
          toast.error('Invalid 2FA code. Please try again.')
          setFormData({ ...formData, twoFactorToken: '' })
        } else if (result.error.includes('locked')) {
          toast.error(result.error)
          setShow2FA(false)
        } else if (errorName === 'INVALID_CREDENTIALS' || result.error.includes('Invalid credentials')) {
          toast.error('Invalid email or password')
          setShow2FA(false)
        } else {
          toast.error(result.error || 'Invalid email or password')
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
    } catch (error: unknown) {
      // Try to handle custom error name if available
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error && typeof (error as { name?: string }).name === 'string'
          ? (error as { name?: string }).name
          : '';
      if (errorName === 'EMAIL_NOT_VERIFIED') {
        toast.error('You must verify your email before signing in.')
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
        }, 1000)
      } else if (errorName === 'TWO_FACTOR_ONBOARDING_REQUIRED') {
        toast.error('You must set up 2FA before accessing your account.')
        setTimeout(() => {
          router.push('/account/security/2fa?onboarding=1')
        }, 1000)
      } else if (errorName === 'INVALID_CREDENTIALS') {
        toast.error('Invalid email or password')
        setShow2FA(false)
      } else {
        console.error('Sign in error:', error)
        toast.error('Something went wrong')
      }
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Forgot password?
                  </Link>
                </div>
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

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl })}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => signIn('github', { callbackUrl })}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </div>

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
