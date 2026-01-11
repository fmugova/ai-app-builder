import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PreviewClient from './PreviewClient'

export default async function PreviewPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch project
  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      userId: user.id
    },
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      type: true,
      isPublished: true,
      publicUrl: true,
      views: true
    }
  })

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Project not found</p>
          <a href="/dashboard" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Validate project code
  if (!project.code || project.code.trim() === '') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center max-w-md">
          <p className="text-xl mb-4">❌ Project has no code</p>
          <p className="text-gray-400 mb-6">This project doesn&apos;t have any code to preview. Try regenerating it in the chat builder.</p>
          <a href={`/chatbuilder?project=${project.id}`} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg inline-block">
            Open in Chat Builder
          </a>
        </div>
      </div>
    )
  }

  // Increment views
  await prisma.project.update({
    where: { id: project.id },
    data: { views: { increment: 1 } }
  })

  return <PreviewClient project={project} />
}