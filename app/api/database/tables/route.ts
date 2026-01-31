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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Database tables GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables', message: errorMessage },
      { status: 500 }
    )
  }
}

// POST: Create new table
export async function POST(request: NextRequest) {
  let requestBody: { 
    connectionId?: string
    name?: string
    schema?: {
      name: string
      columns: Array<{
        name: string
        type: string
        primaryKey?: boolean
        nullable?: boolean
        unique?: boolean
        defaultValue?: string | number | boolean
      }>
      timestamps?: boolean
      softDeletes?: boolean
    }
  } = {}
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    requestBody = await request.json()
    const { connectionId, name, schema } = requestBody

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

    // Get user for activity logging
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
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

    // Log activity for table creation
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'database',
        action: 'table_created',
        metadata: {
          connectionId,
          tableName: name,
          columnCount: schema.columns?.length || 0,
          hasTimestamps: schema.timestamps || false,
          hasSoftDeletes: schema.softDeletes || false
        }
      }
    })

    return NextResponse.json({
      table,
      sql,
      success: true
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Database table POST error:', error)
    
    // Provide SQL in error response for manual execution fallback
    let fallbackSQL = null
    try {
      if (requestBody?.schema) {
        fallbackSQL = generateTableSQL(requestBody.schema)
      }
    } catch {
      // Ignore SQL generation errors in error handler
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create table', 
        message: errorMessage,
        sql: fallbackSQL
      },
      { status: 500 }
    )
  }
}
