import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'
import { z } from 'zod'
import { testSupabaseConnection } from '@/lib/supabase-integration'

const createConnectionSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum(['supabase', 'postgres', 'mysql', 'mongodb', 'sqlite']).default('supabase'),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  supabaseUrl: z.string().optional(),
  supabaseAnonKey: z.string().optional(),
  supabaseServiceKey: z.string().optional(),
})

export const dynamic = 'force-dynamic'

// GET: List database connections
export const GET = withAuth(async (req, context, session) => {
  try {
    const connections = await prisma.databaseConnection.findMany({
      where: { userId: session.user.id },
      include: {
        Project: {
          select: {
            id: true,
            name: true
          }
        },
        Tables: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Don't send sensitive keys to frontend
    const sanitized = connections.map(conn => ({
      ...conn,
      password: undefined,
      supabaseServiceKey: undefined
    }))

    return NextResponse.json({ connections: sanitized })
  } catch (error: any) {
    console.error('Database connections GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
})

// POST: Create new database connection
export const POST = withAuth(async (req, context, session) => {
  try {
    // Check Pro subscription
    if (!['pro', 'business', 'enterprise'].includes(session.user.subscriptionTier)) {
      return NextResponse.json(
        { error: 'Pro subscription required for database connections' },
        { status: 403 }
      )
    }

    // Check limit
    const dbCount = await prisma.databaseConnection.count({
      where: { userId: session.user.id }
    })

    const limits = {
      free: 0,
      pro: 3,
      business: 10,
      enterprise: -1
    }

    const limit = limits[session.user.subscriptionTier as keyof typeof limits]
    if (limit !== -1 && dbCount >= limit) {
      return NextResponse.json(
        { error: 'Database connection limit reached' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { name, projectId, supabaseUrl, supabaseAnonKey, supabaseServiceKey } = body

    if (!name || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Debug logging
    console.log('=== TESTING SUPABASE CONNECTION ===')
    console.log('URL:', supabaseUrl)
    console.log('Anon Key Length:', supabaseAnonKey?.length)
    console.log('Service Key Length:', supabaseServiceKey?.length)

    const isValid = await testSupabaseConnection({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey
    })

    console.log('Connection test result:', isValid)
    console.log('=== END TEST ===')

    if (!isValid) {
      return NextResponse.json(
        { error: 'Failed to connect to Supabase. Check your credentials.' },
        { status: 400 }
      )
    }

    // Create connection
    const connection = await prisma.databaseConnection.create({
      data: {
        userId: session.user.id,
        projectId: projectId || null,
        name,
        provider: 'supabase',
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceKey: supabaseServiceKey || null,
        status: 'connected'
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      connection: {
        ...connection,
        supabaseServiceKey: undefined
      }
    })
  } catch (error: any) {
    console.error('Database connection POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create connection', message: error.message },
      { status: 500 }
    )
  }
})