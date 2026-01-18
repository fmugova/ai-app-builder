// app/api/projects/[id]/endpoints/generate/route.ts
// AI generation endpoint

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiEndpoint, validateGeneratedCode } from '@/lib/api-generator'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;

    const {
      description,
      method = 'GET',
      path = '/api/endpoint',
      requiresAuth = false,
      usesDatabase = false,
      databaseTable
    } = await req.json()

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        User: { email: session.user.email }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate with AI
    const result = await generateApiEndpoint({
      description,
      method,
      path,
      requiresAuth,
      usesDatabase,
      databaseTable
    })

    // Validate
    const validation = validateGeneratedCode(result.code)

    return NextResponse.json({
      code: result.code,
      path: result.path,
      method: result.method,
      validation
    })
  } catch (error: unknown) {
    console.error('Generate endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to generate endpoint' },
      { status: 500 }
    )
  }
}
