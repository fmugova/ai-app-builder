import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SubmissionsClient from './SubmissionsClient'

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }
  const { id } = await params

  const submissions = await prisma.formSubmission.findMany({
    where: { projectId: id },
    orderBy: { submittedAt: 'desc' }
  })

  return <SubmissionsClient submissions={submissions} projectId={id} />
}