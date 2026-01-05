import { NextResponse } from 'next/server'
import { 
  withAuth, 
  withAdmin, 
  withSubscription,
  withUsageCheck,
  withRateLimit,
  compose 
} from '@/lib/api-middleware'

// Simple authenticated route
export const GET = withAuth(async (req, context, session) => {
  return NextResponse.json({ 
    message: 'Authenticated!',
    user: session.user 
  })
})

// Protected POST with multiple middleware
export const POST = compose(
  withRateLimit(20),
  withUsageCheck('create_project'),
  withSubscription('pro'),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  return NextResponse.json({ 
    message: 'All checks passed!',
    userId: session.user.id,
    tier: session.user.subscriptionTier,
    data: body
  })
})

// Admin-only DELETE
export const DELETE = withAdmin(async (req, context, session) => {
  return NextResponse.json({ 
    message: 'Admin action performed',
    adminEmail: session.user.email
  })
})
