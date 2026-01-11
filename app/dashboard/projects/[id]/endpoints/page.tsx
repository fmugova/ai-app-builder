import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ApiEndpointsPage from '@/components/ApiEndpointsPage'
import { ApiEndpointsSkeleton } from '@/components/LoadingSkeleton'

async function EndpointsContent({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      User: { email: session.user.email }
    }
  })

  if (!project) redirect('/dashboard')

  return (
    <ApiEndpointsPage
      projectId={project.id}
      projectName={project.name}
    />
  )
}

export default function EndpointsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<ApiEndpointsSkeleton />}>
      <EndpointsContent params={params} />
    </Suspense>
  )
}
