import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import SubmissionsClient from './SubmissionsClient'

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id } = await params

  // Verify ownership before fetching any data
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) notFound()

  const [submissions, projectUsers] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { projectId: id },
      orderBy: { submittedAt: 'desc' }
    }),
    prisma.projectUser.findMany({
      where: { projectId: id },
      select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: 'desc' }
    }),
  ])

  return <SubmissionsClient submissions={submissions} projectId={id} projectUsers={projectUsers} />
}