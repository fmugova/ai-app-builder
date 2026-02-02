// app/api/database/tables/[tableId]/route.ts
// ⚠️ ASSUMES: DatabaseTable has "connection" back-reference (most common)
// If your schema uses "databaseConnection", change all "connection" to "databaseConnection"

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
): Promise<Response> {
  const { tableId } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Use "connection" - change if your schema uses a different name
    const table = await prisma.databaseTable.findUnique({
      where: { id: tableId },
      include: {
        DatabaseConnection: true  // <-- Use the exact relation name
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || table.DatabaseConnection.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ table })

  } catch (error) {
    console.error('Get table error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
): Promise<Response> {
  const { tableId } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, schema } = body

    const table = await prisma.databaseTable.findUnique({
      where: { id: tableId },
      include: { DatabaseConnection: true }  // ← Use the exact relation name
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || table.DatabaseConnection.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updatedTable = await prisma.databaseTable.update({
      where: { id: tableId },
      data: {
        ...(name && { name }),
        ...(schema && { schema }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      table: updatedTable,
      message: 'Table updated successfully' 
    })

  } catch (error) {
    console.error('Update table error:', error)
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
): Promise<Response> {
  const { tableId } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const table = await prisma.databaseTable.findUnique({
      where: { id: tableId },
      include: { DatabaseConnection: true }  // ← Use the exact relation name
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || table.DatabaseConnection.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.databaseTable.delete({
      where: { id: tableId }
    })

    return NextResponse.json({ 
      message: 'Table deleted successfully' 
    })

  } catch (error) {
    console.error('Delete table error:', error)
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    )
  }
}