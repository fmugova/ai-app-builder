import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PreviewClient from './PreviewClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PreviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    notFound()
  }

  const { id } = await params

  // Fetch project from database
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      User: {
        select: {
          email: true
        }
      }
    }
  })

  if (!project) {
    notFound()
  }

  // Check if user has access (owner or admin)
  const isOwner = project.User.email === session.user.email
  const isAdmin = session.user.email === process.env.ADMIN_EMAIL

  if (!isOwner && !isAdmin) {
    notFound()
  }

  // Increment view count
  await prisma.project.update({
    where: { id },
    data: {
      views: {
        increment: 1
      }
    }
  })

  // Prepare project data for client
  const projectData = {
    id: project.id,
    name: project.name,
    description: project.description,
    code: project.code,
    type: project.type,
    isPublished: project.isPublished,
    publicUrl: project.publicUrl,
    views: project.views + 1 // Include the incremented view
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading preview...</div>}>
      <PreviewClient projectId={projectData.id} />
    </Suspense>
  )
}