import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import GitHubIntegrationClient from './GitHubIntegrationClient'

export default async function GitHubIntegrationPage() {
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
    select: {
      githubUsername: true,
      githubAccessToken: true,
    }
  })

  const isConnected = !!user?.githubUsername

  return (
    <GitHubIntegrationClient 
      initialUsername={user?.githubUsername}
      initialConnected={isConnected}
    />
  )
}
