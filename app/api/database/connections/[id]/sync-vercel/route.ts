// app/api/database/connections/[id]/sync-vercel/route.ts
// Sync Supabase credentials to Vercel environment variables

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncSupabaseEnvVarsToVercel } from '@/lib/vercel-env-sync'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: connectionId } = await context.params

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the database connection
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Database connection not found' },
        { status: 404 }
      )
    }

    // Verify it's a Supabase connection
    if (connection.provider !== 'supabase') {
      return NextResponse.json(
        { error: 'Only Supabase connections can be synced to Vercel' },
        { status: 400 }
      )
    }

    // Check for required Supabase credentials
    if (!connection.supabaseUrl || !connection.supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 400 }
      )
    }

    // Get user's Vercel connection
    const vercelConnection = await prisma.vercelConnection.findUnique({
      where: { userId: session.user.id }
    })

    if (!vercelConnection) {
      return NextResponse.json(
        { 
          error: 'Vercel not connected. Please connect Vercel first.',
          action: 'connect_vercel',
          redirectUrl: '/integrations/vercel'
        },
        { status: 400 }
      )
    }

    // Get Vercel project ID from request body
    const body = await request.json()
    const { vercelProjectId } = body

    if (!vercelProjectId) {
      return NextResponse.json(
        { error: 'Vercel project ID is required' },
        { status: 400 }
      )
    }

    // Validate Vercel project ID to prevent misuse in outbound requests
    if (typeof vercelProjectId !== 'string') {
      return NextResponse.json(
        { error: 'Vercel project ID must be a string' },
        { status: 400 }
      )
    }

    // Allow only a conservative set of characters and length for project IDs
    const vercelProjectIdPattern = /^[a-zA-Z0-9_-]{1,64}$/
    if (!vercelProjectIdPattern.test(vercelProjectId)) {
      return NextResponse.json(
        { error: 'Invalid Vercel project ID format' },
        { status: 400 }
      )
    }

    // Sync environment variables
    const result = await syncSupabaseEnvVarsToVercel({
      vercelProjectId,
      vercelToken: vercelConnection.accessToken,
      supabaseUrl: connection.supabaseUrl,
      supabaseAnonKey: connection.supabaseAnonKey,
      supabaseServiceKey: connection.supabaseServiceKey || undefined
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to sync some environment variables',
          synced: result.synced,
          errors: result.errors
        },
        { status: 207 } // Multi-Status
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Environment variables synced successfully',
      synced: result.synced,
      nextSteps: [
        'Environment variables are now available in your Vercel project',
        'Redeploy your project for changes to take effect',
        'The following variables were synced: ' + result.synced.join(', ')
      ]
    })

  } catch (error: unknown) {
    console.error('Vercel sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync environment variables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
