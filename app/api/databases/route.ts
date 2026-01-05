import { compose, withAuth, withSubscription, withUsageCheck } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createDatabaseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['postgres', 'mysql', 'mongodb']),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
})

export const GET = compose(
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  const databases = await prisma.databaseConnection.findMany({
    where: { userId: session.user.id },
  })
  
  return NextResponse.json({ databases })
})

export const POST = compose(
  withUsageCheck('create_database'),
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  const body = await req.json()
  
  const result = createDatabaseSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }
  
  const db = await prisma.databaseConnection.create({
    data: {
      ...result.data,
      userId: session.user.id,
    },
  })
  
  return NextResponse.json({ database: db }, { status: 201 })
})
