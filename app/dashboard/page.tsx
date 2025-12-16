import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { ProjectCard } from '@/components/ProjectCard'

export default async function DashboardPage() {
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
      role: true,
      generationsUsed: true,
      generationsLimit: true,
      stripeSubscriptionId: true,
    }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 12,
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
    }
  })

  const projectCount = await prisma.project.count({
    where: { userId: user.id }
  })

  const plan = user.role === 'admin' ? 'Enterprise' : (user.stripeSubscriptionId ? 'Pro' : 'Free')
  const generationsUsed = user.generationsUsed || 0
  const generationsLimit = user.generationsLimit || 10

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              BuildFlow
            </Link>
            <Navigation variant="dashboard" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.name || 'there'}! 👋
          </h1>
          <p className="text-gray-400">
            You have {projectCount} project{projectCount !== 1 ? 's' : ''} in your workspace.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">Projects</p>
                <p className="text-3xl font-bold text-white">{projectCount}/999</p>
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((projectCount / 999) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round((projectCount / 999) * 100)}% used this month
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">AI Generations</p>
                <p className="text-3xl font-bold text-white">{generationsUsed}/{generationsLimit}</p>
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((generationsUsed / generationsLimit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round((generationsUsed / generationsLimit) * 100)}% used this month
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 border border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-purple-200">Your Plan</p>
                <p className="text-3xl font-bold text-white">{plan}</p>
              </div>
              <span className="text-3xl">👑</span>
            </div>
            {plan === 'Free' && (
              <Link 
                href="/pricing"
                className="block w-full py-2 px-4 bg-white text-purple-600 rounded-lg font-medium text-center hover:bg-purple-50 transition text-sm"
              >
                Upgrade Now
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/builder"
            className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 hover:from-purple-700 hover:to-pink-700 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✨</span>
              <h3 className="text-lg font-semibold text-white">New Project</h3>
            </div>
            <p className="text-sm text-purple-100">Create with AI</p>
          </Link>

          <Link
            href="/builder?templates=true"
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📋</span>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">Templates</h3>
            </div>
            <p className="text-sm text-gray-400">6 ready to use</p>
          </Link>

          <Link
            href="/tutorial"
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎓</span>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">Tutorial</h3>
            </div>
            <p className="text-sm text-gray-400">Learn the basics</p>
          </Link>

          <Link
            href="/contact"
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💬</span>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">Get Help</h3>
            </div>
            <p className="text-sm text-gray-400">Email support</p>
          </Link>
        </div>

        {/* Projects Section */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Projects</h2>
              <p className="text-gray-400 text-sm">{projectCount} projects found</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search projects..."
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Link 
                href="/builder"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <span>✨</span>
                <span>New Project</span>
              </Link>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📁</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-6">Create your first project to get started</p>
              <Link 
                href="/builder"
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {projectCount > 12 && (
            <div className="mt-6 text-center">
              <Link 
                href="/projects"
                className="inline-block px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                View All Projects ({projectCount})
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Tips Section - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-20 max-w-sm">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="text-white font-semibold mb-1">Pro Tip</h4>
              <p className="text-sm text-purple-100">
                Use descriptive prompts for better results. Include details about colors, layout, and features you want.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}