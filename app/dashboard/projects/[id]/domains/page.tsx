import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DomainsClient from './DomainsClient'

export const dynamic = 'force-dynamic'

interface DomainsPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomDomainsPage({ params }: DomainsPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const { id: projectId } = await params

  // Verify user owns this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...(user.role !== 'admin' && { userId: user.id })
    },
    select: {
      id: true,
      name: true
    }
  })

  if (!project) {
    redirect('/dashboard?error=Project+not+found')
  }

  // Get all domains for this project
  const domains = await prisma.customDomain.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  })

  // Convert dates to strings for serialization
  const serializedDomains = domains.map(domain => ({
    ...domain,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
    verifiedAt: domain.verifiedAt?.toISOString() || null,
    sslIssuedAt: domain.sslIssuedAt?.toISOString() || null,
  }))

  return (
    <DomainsClient
      projectId={projectId}
      projectName={project.name}
      initialDomains={serializedDomains}
    />
  )
}