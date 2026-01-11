import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EnvironmentVariablesPage from '@/components/EnvironmentVariablesPage'
import { EnvironmentVariablesSkeleton } from '@/components/LoadingSkeleton'

async function EnvVarsContent({ params }: { params: { id: string } }) {
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
    <EnvironmentVariablesPage
      projectId={project.id}
      projectName={project.name}
    />
  )
}

export default function EnvVarsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<EnvironmentVariablesSkeleton />}>
      <EnvVarsContent params={params} />
    </Suspense>
  )
}
