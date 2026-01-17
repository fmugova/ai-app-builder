import { withAuth } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateConnectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.enum(['supabase', 'postgres', 'mysql', 'mongodb', 'sqlite']).optional(),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  supabaseUrl: z.string().optional(),
  supabaseAnonKey: z.string().optional(),
  supabaseServiceKey: z.string().optional(),
})

export const GET = withAuth(async (req, context, session) => {
  try {
    // Check Pro subscription
    if (!['pro', 'business', 'enterprise'].includes(session.user.subscriptionTier)) {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    // Check ownership
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: typeof context.params.id === 'string' ? context.params.id : String(context.params.id),
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        provider: true,
        host: true,
        port: true,
        database: true,
        username: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // Don't return password
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, connection })
  } catch (error) {
    console.error('Failed to fetch connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(async (req, context, session) => {
  try {
    // Check Pro subscription
    if (!['pro', 'business', 'enterprise'].includes(session.user.subscriptionTier)) {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    // Check ownership
    const existing = await prisma.databaseConnection.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    
    // Validate input
    const result = updateConnectionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error },
        { status: 400 }
      )
    }
    
    // Update database connection
    const connection = await prisma.databaseConnection.update({
      where: { id: context.params.id },
      data: result.data,
      select: {
        id: true,
        name: true,
        provider: true,
        host: true,
        port: true,
        database: true,
        username: true,
        status: true,
        updatedAt: true,
      },
    })
    
    // Log security event
    await logSecurityEvent({
      userId: session.user.id,
      type: 'database_connection_updated',
      action: 'success',
      metadata: {
        connectionId: connection.id,
        fields: Object.keys(result.data),
      },
      severity: 'info',
    })
    
    return NextResponse.json({ success: true, connection })
    
  } catch (error) {
    console.error('Failed to update database connection:', error)
    return NextResponse.json(
      { error: 'Failed to update database connection' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (req, context, session) => {
  try {
    // Check Pro subscription
    if (!['pro', 'business', 'enterprise'].includes(session.user.subscriptionTier)) {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    // Check ownership
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    await prisma.databaseConnection.delete({
      where: { id: context.params.id },
    })
    
    // Log security event
    await logSecurityEvent({
      userId: session.user.id,
      type: 'database_connection_deleted',
      action: 'success',
      metadata: {
        connectionId: context.params.id,
      },
      severity: 'info',
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Failed to delete database connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete database connection' },
      { status: 500 }
    )
  }
})
