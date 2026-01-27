// ============================================================================
// FIXED PREVIEW PAGE - app/preview/[id]/page.tsx
// ============================================================================

import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'

interface PreviewPageProps {
  params: {
    id: string
  }
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = params
  
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        html: true,       // ✅ NEW
        htmlCode: true,   // ✅ NEW
        updatedAt: true,
      }
    })
    
    if (!project) {
      notFound()
    }
    
    // ✅ FIX: Check ALL three code fields
    const code = project.code || project.html || project.htmlCode || ''
    
    console.log('🔍 Preview page loading:', {
      id: project.id,
      name: project.name,
      codeLength: project.code?.length || 0,
      htmlLength: project.html?.length || 0,
      htmlCodeLength: project.htmlCode?.length || 0,
      finalCodeLength: code.length
    })
    
    if (!code) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              No Code Found
            </h1>
            <p className="text-gray-600">
              This project doesn&apos;t have any code yet.
            </p>
          </div>
        </div>
      )
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
    
    return (
      <div className="min-h-screen bg-white">
        <iframe
          srcDoc={code}
          className="w-full h-screen border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title={project.name}
        />
      </div>
    )
  } catch (error) {
    console.error('❌ Preview error:', error)
    notFound()
  }
}