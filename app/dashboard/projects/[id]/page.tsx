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
    select: { id: true, role: true }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const { id } = await params

  // Get project - using CORRECT Prisma field names
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
      isPublished: true,      // Prisma uses isPublished
      publicUrl: true,        // Prisma uses publicUrl
      createdAt: true,
      updatedAt: true,
    }
  })

  if (!project) {
    redirect('/dashboard?error=Project+not+found')
  }

  // Fetch pages for multi-page preview
  const pages = await prisma.page.findMany({
    where: { projectId: id },
    orderBy: [
      { isHomepage: 'desc' },
      { order: 'asc' },
      { createdAt: 'asc' },
    ],
  })

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
            id: project.id,
            name: project.name,
            description: project.description,
            code: project.code,
            published: project.isPublished,           // Map isPublished → published
            publishedUrl: project.publicUrl,          // Map publicUrl → publishedUrl
            deployedUrl: null,                        // These might not exist
            githubUrl: null,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          }}
          pages={pages.map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            content: p.content,
            description: p.description,
            metaTitle: p.metaTitle,
            metaDescription: p.metaDescription,
            isHomepage: p.isHomepage,
            order: p.order,
            isPublished: p.isPublished,
          }))}
        />
      </div>
    </>
  )
}