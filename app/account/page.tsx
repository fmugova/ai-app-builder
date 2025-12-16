import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      generationsUsed: true,
      generationsLimit: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      createdAt: true,
    }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const projectCount = await prisma.project.count({
    where: { userId: user.id }
  })

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
                    {user.generationsUsed || 0} / {user.generationsLimit || 10} used
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
                <a 
                  href="/api/billing/portal"
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Manage Subscription
                </a>
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