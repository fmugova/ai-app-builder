import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PagesManagementClient from './PagesManagementClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PagesManagementPage({ params }: PageProps) {
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

  const { id: projectId } = await params

  // Verify user owns this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...(user.role !== 'admin' && { userId: user.id }),
    },
    include: {
      pages: {
        orderBy: [
          { isHomepage: 'desc' },
          { order: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
  })

  if (!project) {
    redirect('/dashboard?error=Project+not+found')
  }

  return (
    <PagesManagementClient
      project={{
        id: project.id,
        name: project.name,
      }}
      initialPages={project.pages.map(page => ({
        ...page,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      }))}
    />
  )
}