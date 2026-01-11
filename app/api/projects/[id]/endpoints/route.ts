// app/api/projects/[id]/endpoints/route.ts
// Manage API endpoints for a project

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiEndpoint, validateGeneratedCode } from '@/lib/api-generator'

// GET - List all endpoints for a project
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        User: { email: session.user.email }
      },
      include: {
        apiEndpoints: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ endpoints: project.apiEndpoints })
  } catch (error: unknown) {
    console.error('Get endpoints error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch endpoints' },
      { status: 500 }
    )
  }
}

// POST - Create new API endpoint (AI-generated or from template)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name,
      description,
      method = 'GET',
      path,
      requiresAuth = false,
      usesDatabase = false,
      databaseTable,
      useAI = true,
      templateId
    } = await req.json()

    // Validation
    if (!name || !path) {
      return NextResponse.json(
        { error: 'Name and path are required' },
        { status: 400 }
      )
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        User: { email: session.user.email }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if endpoint already exists
    const existing = await prisma.apiEndpoint.findUnique({
      where: {
        projectId_path_method: {
          projectId: params.id,
          path,
          method
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: `Endpoint ${method} ${path} already exists` },
        { status: 400 }
      )
    }

    let code: string

    if (useAI && description) {
      // Generate with AI
      try {
        const result = await generateApiEndpoint({
          description,
          method,
          path,
          requiresAuth,
          usesDatabase,
          databaseTable
        })
        code = result.code
      } catch {
        return NextResponse.json(
          { error: 'Failed to generate endpoint with AI' },
          { status: 500 }
        )
      }
    } else if (templateId) {
      // Generate from template
      // TODO: Implement template-based generation
      return NextResponse.json(
        { error: 'Template generation not yet implemented' },
        { status: 501 }
      )
    } else {
      return NextResponse.json(
        { error: 'Must provide either description (for AI) or templateId' },
        { status: 400 }
      )
    }

    // Validate generated code
    const validation = validateGeneratedCode(code)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Generated code validation failed',
          details: validation.errors
        },
        { status: 500 }
      )
    }

    // Create endpoint
    const endpoint = await prisma.apiEndpoint.create({
      data: {
        projectId: params.id,
        name,
        path,
        method,
        description,
        code,
        requiresAuth,
        usesDatabase,
        databaseTable,
        isActive: true,
        testsPassed: false
      }
    })

    return NextResponse.json({
      endpoint,
      validation
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to create endpoint' },
      { status: 500 }
    )
  }
}

// PUT - Update endpoint
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpointId, code, name, description, isActive } = await req.json()

    if (!endpointId) {
      return NextResponse.json(
        { error: 'Endpoint ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const endpoint = await prisma.apiEndpoint.findFirst({
      where: {
        id: endpointId,
        project: {
          id: params.id,
          User: { email: session.user.email }
        }
      }
    })

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }

    // Validate code if provided
    let validation
    if (code) {
      validation = validateGeneratedCode(code)
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Code validation failed',
            details: validation.errors
          },
          { status: 400 }
        )
      }
    }

    // Update endpoint
    const updated = await prisma.apiEndpoint.update({
      where: { id: endpointId },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(description && { description }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({ endpoint: updated, validation })
  } catch (error: unknown) {
    console.error('Update endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to update endpoint' },
      { status: 500 }
    )
  }
}
