import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ApiEndpointsPage from '@/components/ApiEndpointsPage'

export default async function EndpointsPage({ params }: { params: { id: string } }) {
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
