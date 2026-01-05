import { compose, withAuth, withSubscription, withUsageCheck, withRateLimit } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createConnectionSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['postgres', 'mysql', 'mongodb', 'sqlite']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional().default(false),
})

export const dynamic = 'force-dynamic'

// GET: List database connections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const connections = await prisma.databaseConnection.findMany({
      where: { userId: user.id },
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
}

// POST: Create new database connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
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
        userId: user.id,
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
}