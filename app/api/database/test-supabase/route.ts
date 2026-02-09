// app/api/database/test-supabase/route.ts
// Test Supabase connection endpoint

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { testSupabaseConnection } from '@/lib/supabase-integration'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const { url, anonKey, serviceKey } = await request.json()

    // Validate inputs
    if (!url || !anonKey) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Supabase URL and Anon Key are required' 
        },
        { status: 400 }
      )
    }

    // Test the connection
    const isValid = await testSupabaseConnection({
      url,
      anonKey,
      serviceKey
    })

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: 'Connection successful! Your Supabase credentials are valid.',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Connection failed. Please verify your credentials and try again.',
        details: 'The URL or keys provided appear to be invalid.'
      }, { status: 400 })
    }

  } catch (error: unknown) {
    console.error('Supabase test error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
