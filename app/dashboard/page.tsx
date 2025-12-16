
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import DashboardClient from './DashboardClient'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

export const metadata = {
  title: 'Dashboard - BuildFlow',
  description: 'Manage your AI-powered projects',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const [user, projects] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        projectsThisMonth: true,
        projectsLimit: true,
        generationsUsed: true,
        generationsLimit: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    }),
    prisma.project.findMany({
      where: { userId: session.user.id as string },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  if (!user) {
    redirect('/auth/signin')
  }

  const isAdmin = user.role === 'admin'
  const stats = {
    projectsThisMonth: user.projectsThisMonth,
    projectsLimit: user.projectsLimit,
    generationsUsed: user.generationsUsed,
    generationsLimit: user.generationsLimit,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
  }

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
      {/* Rest of dashboard content */}
      <DashboardClient
        initialProjects={JSON.parse(JSON.stringify(projects))}
        stats={stats}
        userName={user.name}
        userEmail={user.email}
        isAdmin={isAdmin}
      />
    </div>
  )
}