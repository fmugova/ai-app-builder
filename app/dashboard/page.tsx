import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

// Server Component - NO 'use client'
export default async function DashboardPage() {
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
      role: true,
      generationsUsed: true,
      generationsLimit: true,
      stripeSubscriptionId: true,
    }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 100, // Get more projects for client-side filtering
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      prompt: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  const projectCount = await prisma.project.count({
    where: { userId: user.id }
  })

  // Map to DashboardClient props
  const stats = {
    projectsThisMonth: projectCount,
    projectsLimit: 999,
    generationsUsed: user.generationsUsed || 0,
    generationsLimit: user.generationsLimit || 10,
    subscriptionTier: user.role === 'admin' ? 'enterprise' : (user.stripeSubscriptionId ? 'pro' : 'free'),
    subscriptionStatus: user.stripeSubscriptionId ? 'active' : 'inactive',
  }

  // Serialize dates for client component
  const serializedProjects = projects.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <DashboardClient
      initialProjects={serializedProjects}
      stats={stats}
      userName={user.name}
      userEmail={user.email}
      isAdmin={user.role === 'admin'}
    />
  )
}