import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import NavigationBuilderClient from './NavigationBuilderClient'

export const dynamic = 'force-dynamic'

interface NavigationPageProps {
  params: Promise<{ id: string }>
}

export default async function NavigationBuilderPage({ params }: NavigationPageProps) {
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
  })

  if (!project) {
    redirect('/dashboard?error=Project+not+found')
  }

  // Fetch pages for navigation
  const pages = await prisma.page.findMany({
    where: { projectId },
    orderBy: [
      { isHomepage: 'desc' },
      { order: 'asc' },
      { createdAt: 'asc' }
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      isHomepage: true,
      order: true
    }
  })

  return (
    <NavigationBuilderClient
      projectId={projectId}
      initialPages={pages}
    />
  )
}