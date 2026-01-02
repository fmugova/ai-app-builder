import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProjectSettingsClient from './ProjectSettingsClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectSettingsPage({ params }: PageProps) {
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

  return (
    <ProjectSettingsClient
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
    />
  )
}