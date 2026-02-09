import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SUPABASE_CLIENT_ID = process.env.SUPABASE_CLIENT_ID!
const SUPABASE_REDIRECT_URI = process.env.SUPABASE_REDIRECT_URI || 'http://localhost:3000/api/integrations/supabase/callback'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Build Supabase OAuth URL
    const supabaseAuthUrl = new URL('https://api.supabase.com/oauth/authorize')
    supabaseAuthUrl.searchParams.set('client_id', SUPABASE_CLIENT_ID)
    supabaseAuthUrl.searchParams.set('redirect_uri', SUPABASE_REDIRECT_URI)
    supabaseAuthUrl.searchParams.set('response_type', 'code')
    supabaseAuthUrl.searchParams.set('scope', 'all')
    supabaseAuthUrl.searchParams.set('state', session.user.email) // Use email as state for verification

    return NextResponse.redirect(supabaseAuthUrl.toString())
  } catch (error: any) {
    console.error('Supabase connect error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=supabase_connect_failed', request.url))
  }
}
