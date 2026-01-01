import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTableSQL } from '@/lib/supabase-integration'

export const dynamic = 'force-dynamic'

// GET: List tables for a database connection
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID required' },
        { status: 400 }
      )
    }

    const tables = await prisma.databaseTable.findMany({
      where: {
        databaseConnectionId: connectionId,
        DatabaseConnection: {
          User: {
            email: session.user.email
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ tables })

  } catch (error: any) {
    console.error('Database tables GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

// POST: Create new table
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { connectionId, name, schema } = body

    if (!connectionId || !name || !schema) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user owns the connection
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: connectionId,
        User: {
          email: session.user.email
        }
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Generate SQL
    const sql = generateTableSQL(schema)

    // Create table record
    const table = await prisma.databaseTable.create({
      data: {
        databaseConnectionId: connectionId,
        name,
        schema
      }
    })

    return NextResponse.json({
      table,
      sql
    })

  } catch (error: any) {
    console.error('Database table POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create table', message: error.message },
      { status: 500 }
    )
  }
}