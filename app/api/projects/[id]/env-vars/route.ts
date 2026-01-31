// app/api/projects/[id]/env-vars/route.ts
// API for managing project environment variables

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  encrypt,
  decrypt,
  isValidEnvKey,
  validateEnvValue
} from '@/lib/encryption'
import { logSecurityEvent } from '@/lib/security'

// GET - List all environment variables for a project
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query user once
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        EnvironmentVariable: {
          orderBy: { key: 'asc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Decrypt values for display (mask sensitive ones)
    const variables = project.EnvironmentVariable.map(v => ({
      id: v.id,
      key: v.key,
      value: decrypt(v.value), // Client will mask if needed
      description: v.description,
      environment: v.environment,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }))

    return NextResponse.json({ variables })
  } catch (error) {
    console.error('Get env vars error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch environment variables' },
      { status: 500 }
    )
  }
}

// POST - Add new environment variable
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query user once
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key, value, description, environment = 'all' } = await req.json()

    // Validation
    if (!key || !value) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    if (!isValidEnvKey(key)) {
      return NextResponse.json(
        {
          error:
            'Invalid key format. Must start with a letter and contain only uppercase letters, numbers, and underscores.'
        },
        { status: 400 }
      )
    }

    const validation = validateEnvValue(value, key)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if key already exists for this environment
    const existing = await prisma.environmentVariable.findUnique({
      where: {
        projectId_key_environment: {
          projectId: id,
          key,
          environment
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: `Variable "${key}" already exists for ${environment}` },
        { status: 400 }
      )
    }

    // Encrypt value
    const encryptedValue = encrypt(value)

    // Create variable
    const variable = await prisma.environmentVariable.create({
      data: {
        projectId: id,
        key,
        value: encryptedValue,
        description,
        environment
      }
    })

    // Log security event
    if (user) {
      await logSecurityEvent({
        userId: user.id,
        type: 'env_var_created',
        action: 'success',
        metadata: {
          projectId: id,
          key,
          environment
        },
        severity: 'info'
      })
    }

    return NextResponse.json({
      variable: {
        id: variable.id,
        key: variable.key,
        description: variable.description,
        environment: variable.environment,
        createdAt: variable.createdAt
        // Don't return value in response
      }
    })
  } catch (error) {
    console.error('Create env var error:', error)
    return NextResponse.json(
      { error: 'Failed to create environment variable' },
      { status: 500 }
    )
  }
}

// PUT - Update environment variable
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query user once
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { variableId, value, description } = await req.json()

    if (!variableId) {
      return NextResponse.json(
        { error: 'Variable ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const variable = await prisma.environmentVariable.findFirst({
      where: {
        id: variableId,
        Project: {
          id,
          userId: user.id
        }
      }
    })

    if (!variable) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 })
    }

    // Validate new value if provided
    if (value) {
      const validation = validateEnvValue(value, variable.key)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    // Update variable
    const updated = await prisma.environmentVariable.update({
      where: { id: variableId },
      data: {
        ...(value && { value: encrypt(value) }),
        ...(description !== undefined && { description })
      }
    })

    // Log security event
    await logSecurityEvent({
      userId: user.id,
      type: 'env_var_updated',
      action: 'success',
      metadata: {
        projectId: id,
        key: variable.key,
        environment: variable.environment,
        changedValue: !!value
      },
      severity: 'info'
    })

    return NextResponse.json({
      variable: {
        id: updated.id,
        key: updated.key,
        description: updated.description,
        environment: updated.environment,
        updatedAt: updated.updatedAt
      }
    })
  } catch (error) {
    console.error('Update env var error:', error)
    return NextResponse.json(
      { error: 'Failed to update environment variable' },
      { status: 500 }
    )
  }
}
