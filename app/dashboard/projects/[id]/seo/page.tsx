import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SEOManagerClient from './SEOManagerClient'

export const dynamic = 'force-dynamic'

interface SEOPageProps {
  params: Promise<{ id: string }>
}

export default async function SEOManagerPage({ params }: SEOPageProps) {
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

  // Fetch pages with SEO data
  const pages = await prisma.page.findMany({
    where: { projectId },
    orderBy: [
      { isHomepage: 'desc' },
      { createdAt: 'asc' }
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      metaTitle: true,
      metaDescription: true,
      ogImage: true,
      isHomepage: true
    }
  })

  return (
    <SEOManagerClient
      projectId={projectId}
      initialPage={pages}
    />
  )
}