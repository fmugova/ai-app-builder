// app/api/database/connections/route.ts
// ⚠️ ASSUMES: DatabaseConnection has "tables" relation (most common)
// If your schema uses a different name, change "tables" to match your schema

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // ✅ Use "tables" if that's the relation name in your schema
    // If your schema uses "databaseTables", change this to "databaseTables"
    const connections = await prisma.databaseConnection.findMany({
      where: { userId: user.id },
      include: {
        DatabaseTable: {  // <-- Use the exact relation name from your schema
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map DatabaseTable to tables for frontend compatibility
    const connectionsWithTables = connections.map(conn => ({
      ...conn,
      tables: conn.DatabaseTable,
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
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      name, 
      provider, 
      connectionString, 
      config,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceKey,
      host,
      port,
      database,
      username,
      password
    } = body

    if (!name || !provider) {
      return NextResponse.json(
        { error: 'Name and provider are required' },
        { status: 400 }
      )
    }

    // For Supabase, validate required fields
    if (provider === 'supabase') {
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          { error: 'Supabase URL and Anon Key are required for Supabase connections' },
          { status: 400 }
        )
      }
    }

    const connection = await prisma.databaseConnection.create({
      data: {
        name,
        provider,
        connectionString,
        config: config || {},
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceKey,
        host,
        port,
        database,
        username,
        password,
        status: 'connected',
        userId: user.id
      },
      include: {
        DatabaseTable: true  // <-- Use the exact relation name
      }
    })

    return NextResponse.json({ 
      connection,
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