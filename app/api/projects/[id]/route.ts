// app/api/projects/[id]/route.ts
// FIXED: Convert BigInt to Number for JSON serialization

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to convert BigInt fields to Number
interface Project {
  [key: string]: unknown;
  generationTime?: bigint | number | null;
  retryCount?: bigint | number | null;
  tokensUsed?: bigint | number | null;
  validationScore?: bigint | number | null;
}

function serializeProject(project: Project) {
  return {
    ...project,
    // Convert BigInt fields to Number
    generationTime: project.generationTime ? Number(project.generationTime) : null,
    retryCount: project.retryCount ? Number(project.retryCount) : null,
    tokensUsed: project.tokensUsed ? Number(project.tokensUsed) : null,
    validationScore: project.validationScore ? Number(project.validationScore) : null,
  }
}

// GET - Fetch single project
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        Page: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    console.log('📦 Fetched project:', {
      id: project.id,
      name: project.name,
      codeLength: project.code?.length,
      htmlLength: project.html?.length,
      htmlCodeLength: project.htmlCode?.length,
    })

    // ✅ Serialize project (convert BigInt to Number)
    return NextResponse.json(serializeProject(project))
    
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH - Update project
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const project = await prisma.project.update({
      where: { id: params.id },
      data: body,
    })

    // ✅ Serialize project (convert BigInt to Number)
    return NextResponse.json(serializeProject(project))
    
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE - Delete project
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
