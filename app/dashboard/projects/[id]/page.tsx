import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UnifiedMobileNav from '@/components/UnifiedMobileNav'
import ProjectOverviewClient from './ProjectOverviewClient'

export const dynamic = 'force-dynamic'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectOverviewPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const { id } = await params

  // Get project
  const project = await prisma.project.findFirst({
    where: {
      id,
      ...(user.role !== 'admin' && { userId: user.id })
    },
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      published: true,
      publishedUrl: true,
      deployedUrl: true,
      githubUrl: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  if (!project) {
    redirect('/dashboard?error=Project+not+found')
  }

  return (
    <>
      {/* Mobile Navigation with project context */}
      <UnifiedMobileNav
        userName={session.user.name || undefined}
        userEmail={session.user.email || undefined}
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
        />
      </div>
    </>
  )
}