// app/api/database/connections/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { z } from 'zod'

const createConnectionSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum(['supabase', 'postgres', 'postgresql', 'mysql', 'mongodb', 'sqlite']),
  connectionString: z.string().max(2000).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  supabaseUrl: z.string().max(500).optional(),
  supabaseAnonKey: z.string().max(500).optional(),
  supabaseServiceKey: z.string().max(500).optional(),
  host: z.string().max(253).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().max(100).optional(),
  username: z.string().max(100).optional(),
  password: z.string().max(500).optional(),
})

// Credential fields never returned in responses
const SAFE_SELECT = {
  id: true,
  name: true,
  provider: true,
  host: true,
  port: true,
  database: true,
  username: true,
  supabaseUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const connections = await prisma.databaseConnection.findMany({
      where: { userId: user.id },
      select: {
        ...SAFE_SELECT,
        DatabaseTable: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const connectionsWithTables = connections.map(({ DatabaseTable, ...conn }) => ({
      ...conn,
      tables: DatabaseTable,
    }))

    return NextResponse.json({ connections: connectionsWithTables })

  } catch (error) {
    console.error('Get connections error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const result = createConnectionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues.map(i => i.message) },
        { status: 400 }
      )
    }

    const {
      name, provider, connectionString, config,
      supabaseUrl, supabaseAnonKey, supabaseServiceKey,
      host, port, database, username, password
    } = result.data

    if (provider === 'supabase' && (!supabaseUrl || !supabaseAnonKey)) {
      return NextResponse.json(
        { error: 'Supabase URL and Anon Key are required for Supabase connections' },
        { status: 400 }
      )
    }

    const connection = await prisma.databaseConnection.create({
      data: {
        name,
        provider,
        connectionString: connectionString ? encrypt(connectionString) : null,
        config: (config ?? {}) as object,
        supabaseUrl: supabaseUrl ?? null,
        supabaseAnonKey: supabaseAnonKey ? encrypt(supabaseAnonKey) : null,
        supabaseServiceKey: supabaseServiceKey ? encrypt(supabaseServiceKey) : null,
        host: host ?? null,
        port: port ?? null,
        database: database ?? null,
        username: username ?? null,
        password: password ? encrypt(password) : null,
        status: 'connected',
        userId: user.id
      },
      select: {
        ...SAFE_SELECT,
        DatabaseTable: true,
      },
    })

    const { DatabaseTable, ...safeConn } = connection as typeof connection & { DatabaseTable: unknown[] }
    return NextResponse.json({
      connection: { ...safeConn, tables: DatabaseTable },
      message: 'Connection created successfully'
    })

  } catch (error) {
    console.error('Create connection error:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}
