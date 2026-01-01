import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase-integration'

export const dynamic = 'force-dynamic'

// GET: Fetch data from table
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('tableId')

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID required' },
        { status: 400 }
      )
    }

    // Get table info
    const table = await prisma.databaseTable.findFirst({
      where: {
        id: tableId,
        DatabaseConnection: {
          User: {
            email: session.user.email
          }
        }
      },
      include: {
        DatabaseConnection: true
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Fetch data from Supabase
    const supabase = createSupabaseAdminClient({
      url: table.DatabaseConnection.supabaseUrl!,
      anonKey: table.DatabaseConnection.supabaseAnonKey!,
      serviceKey: table.DatabaseConnection.supabaseServiceKey!
    })

    const { data, error } = await supabase
      .from(table.name)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch data', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('Data GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

// POST: Create new record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tableId, data } = body

    if (!tableId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const table = await prisma.databaseTable.findFirst({
      where: {
        id: tableId,
        DatabaseConnection: {
          User: {
            email: session.user.email
          }
        }
      },
      include: {
        DatabaseConnection: true
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const supabase = createSupabaseAdminClient({
      url: table.DatabaseConnection.supabaseUrl!,
      anonKey: table.DatabaseConnection.supabaseAnonKey!,
      serviceKey: table.DatabaseConnection.supabaseServiceKey!
    })

    const { data: result, error } = await supabase
      .from(table.name)
      .insert([data])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create record', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: result })

  } catch (error: any) {
    console.error('Data POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create record' },
      { status: 500 }
    )
  }
}

// PATCH: Update record
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tableId, recordId, data } = body

    if (!tableId || !recordId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const table = await prisma.databaseTable.findFirst({
      where: {
        id: tableId,
        DatabaseConnection: {
          User: {
            email: session.user.email
          }
        }
      },
      include: {
        DatabaseConnection: true
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const supabase = createSupabaseAdminClient({
      url: table.DatabaseConnection.supabaseUrl!,
      anonKey: table.DatabaseConnection.supabaseAnonKey!,
      serviceKey: table.DatabaseConnection.supabaseServiceKey!
    })

    const { data: result, error } = await supabase
      .from(table.name)
      .update(data)
      .eq('id', recordId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update record', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: result })

  } catch (error: any) {
    console.error('Data PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete record
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tableId, recordId } = body

    if (!tableId || !recordId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const table = await prisma.databaseTable.findFirst({
      where: {
        id: tableId,
        DatabaseConnection: {
          User: {
            email: session.user.email
          }
        }
      },
      include: {
        DatabaseConnection: true
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const supabase = createSupabaseAdminClient({
      url: table.DatabaseConnection.supabaseUrl!,
      anonKey: table.DatabaseConnection.supabaseAnonKey!,
      serviceKey: table.DatabaseConnection.supabaseServiceKey!
    })

    const { error } = await supabase
      .from(table.name)
      .delete()
      .eq('id', recordId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete record', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Data DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete record' },
      { status: 500 }
    )
  }
}