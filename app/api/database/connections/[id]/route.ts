import { compose, withAuth, withSubscription, withResourceOwnership, withRateLimit } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateConnectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  ssl: z.boolean().optional(),
})

export const GET = compose(
  withResourceOwnership('database', (params) => params.id),
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  const connection = await prisma.databaseConnection.findUnique({
    where: { id: context.params.id },
    select: {
      id: true,
      name: true,
      type: true,
      host: true,
      port: true,
      database: true,
      username: true,
      ssl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // Don't return password
    },
  })
  
  return NextResponse.json({ success: true, connection })
})

export const PUT = compose(
  withRateLimit(30),
  withResourceOwnership('database', (params) => params.id),
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  try {
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
        type: true,
        host: true,
        port: true,
        database: true,
        username: true,
        ssl: true,
        status: true,
        updatedAt: true,
      },
    })
    
    // Log security event
    await logSecurityEvent(session.user.id, 'database_connection_updated', {
      connectionId: connection.id,
      fields: Object.keys(result.data),
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

export const DELETE = compose(
  withResourceOwnership('database', (params) => params.id),
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  try {
    await prisma.databaseConnection.delete({
      where: { id: context.params.id },
    })
    
    // Log security event
    await logSecurityEvent(session.user.id, 'database_connection_deleted', {
      connectionId: context.params.id,
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
