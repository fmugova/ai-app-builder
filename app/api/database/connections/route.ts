import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { testSupabaseConnection } from '@/lib/supabase-integration'
import { encrypt, decrypt } from '@/lib/encryption'

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

    // Test connection
    const isValid = await testSupabaseConnection({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey
    })

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