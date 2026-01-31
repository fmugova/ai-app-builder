'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface User {
  name?: string;
  email: string;
  createdAt: string;
  generationsUsed?: number;
  generationsLimit?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [projectCount, setProjectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [managingSubscription, setManagingSubscription] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
    
    if (status === 'authenticated' && session?.user?.email) {
      fetchUserData()
    }
  }, [status, session])

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/user/profile')
      const data = await res.json()
      setUser(data.user)
      setProjectCount(data.projectCount)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setManagingSubscription(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to open billing portal')
      }
      
      const { url } = await res.json()
      window.location.href = url
    } catch (error: unknown) {
      console.error('Portal error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to open billing portal')
      } else {
        toast.error('Failed to open billing portal')
      }
      setManagingSubscription(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const plan = user.stripeSubscriptionId ? 'Pro' : 'Free'

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                BuildFlow
              </Link>
              <span className="text-gray-500">→</span>
              <h1 className="text-lg font-semibold text-white">Account</h1>
            </div>
            <Link 
              href="/dashboard"
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <div className="bg-gray-800 rounded-lg p-3 text-white">
                  {user.name || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="bg-gray-800 rounded-lg p-3 text-white">
                  {user.email}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Member Since</label>
              <div className="bg-gray-800 rounded-lg p-3 text-white">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6">Plan & Usage</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Current Plan</label>
              <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold text-lg">
                    {plan}
                  </span>
                  {plan !== 'Free' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                      Active
                    </span>
                  )}
                </div>
                {plan === 'Free' && (
                  <Link 
                    href="/pricing"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">AI Generations</label>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white">
                    {String(user.generationsUsed || 0)} / {String(user.generationsLimit || 10)} used
                  </span>
                  <span className="text-gray-400 text-sm">
                    {Math.round(((user.generationsUsed || 0) / (user.generationsLimit || 10)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(((user.generationsUsed || 0) / (user.generationsLimit || 10)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Total Projects</label>
              <div className="bg-gray-800 rounded-lg p-3 text-white">
                {projectCount} project{projectCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {user.stripeSubscriptionId && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-6">Subscription</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Status</label>
                <div className="bg-gray-800 rounded-lg p-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-400">
                    ✓ Active Subscription
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Subscription ID</label>
                <div className="bg-gray-800 rounded-lg p-3 text-white font-mono text-sm break-all">
                  {user.stripeSubscriptionId}
                </div>
              </div>
              
              {user.stripeCustomerId && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Customer ID</label>
                  <div className="bg-gray-800 rounded-lg p-3 text-white font-mono text-sm break-all">
                    {user.stripeCustomerId}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={handleManageSubscription}
                  disabled={managingSubscription}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  {managingSubscription ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Opening...
                    </>
                  ) : (
                    'Manage Subscription'
                  )}
                </button>
                <p className="text-sm text-gray-400 mt-2">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/projects"
            className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-500 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">📁</span>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">
                View Projects
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              Browse all your {projectCount} project{projectCount !== 1 ? 's' : ''}
            </p>
          </Link>

          <Link
            href="/builder"
            className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-500 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">
                New Project
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              Create a new app with AI
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}
