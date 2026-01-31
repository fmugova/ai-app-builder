import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      autoSave: true,
      notifications: true,
      theme: true,
      role: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      generationsUsed: true,
      generationsLimit: true,
      projectsThisMonth: true,
      projectsLimit: true,
      githubUsername: true,
      createdAt: true,
    }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <SettingsClient
      user={{
        id: user.id,
        name: user.name || '',
        email: user.email,
        bio: user.bio,
        autoSave: user.autoSave,
        notifications: user.notifications,
        theme: user.theme,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        generationsUsed: user.generationsUsed,
        generationsLimit: user.generationsLimit,
        projectsThisMonth: user.projectsThisMonth,
        projectsLimit: user.projectsLimit,
        githubUsername: user.githubUsername,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  )
}
