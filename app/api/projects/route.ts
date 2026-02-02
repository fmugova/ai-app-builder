// app/api/projects/route.ts
// FIXED: Convert BigInt to Number for JSON serialization

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to convert BigInt fields to Number
function serializeProject(project: any) {
  return {
    ...project,
    // Convert BigInt fields to Number
    generationTime: project.generationTime ? Number(project.generationTime) : null,
    retryCount: project.retryCount ? Number(project.retryCount) : null,
    tokensUsed: project.tokensUsed ? Number(project.tokensUsed) : null,
    validationScore: project.validationScore ? Number(project.validationScore) : null,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // ✅ Serialize all projects (convert BigInt to Number)
    const serializedProjects = projects.map(serializeProject)

    return NextResponse.json({ projects: serializedProjects })
    
  } catch (error) {
    console.error('GET /api/projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST - Create new project
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, type, code } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        type: type || 'web',
        code: code || '',
      },
    })

    // ✅ Serialize project (convert BigInt to Number)
    return NextResponse.json(serializeProject(project))
    
  } catch (error) {
    console.error('POST /api/projects error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
