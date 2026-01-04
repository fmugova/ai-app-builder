import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import UnifiedMobileNav from '@/components/UnifiedMobileNav'
import React from 'react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const { id } = await params

  // Admins can view any project, regular users only their own
  const project = await prisma.project.findFirst({
    where: {
      id,
      ...(user.role !== 'admin' && { userId: user.id }),
    },
  })

  if (!project) {
    redirect('/dashboard?error=Project+not+found')
  }

  // Get project analytics
  const totalViews = project.views || 0
  
  // Get recent activity for this project
  const recentActivity = await prisma.activity.findMany({
    where: {
      userId: user.id,
      metadata: {
        path: ['projectId'],
        equals: project.id,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return (
    <>
      {/* Override root nav with project context */}
      <UnifiedMobileNav
        userName={user.name || undefined}
        userEmail={user.email}
        isAdmin={user.role === 'admin'}
        currentProjectId={project.id}
        currentProjectName={project.name}
      />
      <div className="pt-0">
        <ProjectOverviewClient
          project={{
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          }}
          user={{
            name: user.name || '',
            email: user.email,
            isAdmin: user.role === 'admin',
          }}
          analytics={{
            totalViews,
            recentActivity: recentActivity.map(a => ({
              id: a.id,
              type: a.type,
              action: a.action,
              createdAt: a.createdAt.toISOString(),
              metadata: a.metadata as any,
            })),
          }}
        />
      </div>
    </>
  )
}