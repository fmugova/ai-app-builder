import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardClientOptimized from './DashboardClientOptimized'
import { DashboardSkeleton } from '@/components/LoadingSkeleton'
import type { Project } from '@/types/project'

export const dynamic = 'force-dynamic'

import DashboardTutorialPopUp from './components/DashboardTutorialPopUpClient'

async function DashboardContent() {
  // Get session
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }
  
  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/dashboard')
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      Subscription: true,
      },
  })

  if (!user) {
    redirect('/auth/signin?error=User+not+found')
  }

  // Fetch user's projects — only lightweight metadata fields.
  // Excluding: code, html, css, javascript, cssCode, htmlCode, jsCode, prompt
  // These are large text blobs (50-100 KB each) that are not needed for the
  // dashboard list. Loading them caused "Load failed" on slow/VPN connections
  // due to the massive RSC payload they added.
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isPublished: true,
      publishedAt: true,
      publishedSiteId: true,
      publicUrl: true,
      publicSlug: true,
      isPublic: true,
      shareToken: true,
      views: true,
      downloads: true,
      tags: true,
      status: true,
      projectType: true,
      isMultiFile: true,
      multiPage: true,
      language: true,
      framework: true,
      validationScore: true,
      validationPassed: true,
      isComplete: true,
    },
  }) as unknown as Project[]

  // Calculate stats
  const stats = {
    projectsThisMonth: Number(user.projectsThisMonth ?? 0),
    projectsLimit: Number(user.projectsLimit ?? 3),
    generationsUsed: Number(user.generationsUsed ?? 0),
    generationsLimit: Number(user.generationsLimit ?? 10),
    subscriptionTier: user.Subscription?.plan || user.subscriptionTier || 'free',
    subscriptionStatus: user.Subscription?.status || user.subscriptionStatus || 'active',
  }

  return (
    <DashboardClientOptimized
      initialProjects={projects}
      stats={stats}
      userName={user.name}
      userEmail={user.email}
      isAdmin={user.role === 'admin'}
    />
  )
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
      <DashboardTutorialPopUp />
    </>
  )
}
