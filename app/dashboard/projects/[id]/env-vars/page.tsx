import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EnvironmentVariablesPage from '@/components/EnvironmentVariablesPage'
import { EnvironmentVariablesSkeleton } from '@/components/LoadingSkeleton'

async function EnvVarsContent({ params }: { params: Promise<{ id: string }> }) {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }
  if (!session) redirect('/login')

  const { id } = await params

  const project = await prisma.project.findFirst({
    where: {
      id,
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

export default function EnvVarsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<EnvironmentVariablesSkeleton />}>
      <EnvVarsContent params={params} />
    </Suspense>
  )
}
