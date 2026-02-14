import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ProjectsPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const projects = await prisma.project.findMany({
    where: { 
      userId: user.id
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      publicUrl: true,
      isPublished: true,
    }
  })

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
              <h1 className="text-lg font-semibold text-white">My Projects</h1>
            </div>
            <Link 
              href="/builder"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              + New Project
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">All Projects</h2>
          <p className="text-gray-400">{projects.length} project{projects.length !== 1 ? 's' : ''} found</p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {projects.map((project) => (
              <Link 
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition border border-gray-800 hover:border-purple-500 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition truncate">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
