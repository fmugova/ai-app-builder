import { NextRequest, NextResponse } from 'next/server'
import { 
  withAuth, 
  withAdmin, 
  withSubscription,
  withUsageCheck,
  withRateLimit,
  compose 
} from '@/lib/api-middleware'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Simple authenticated route
export const GET = compose(
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  return NextResponse.json({
    message: 'Success',
    userId: session.user.id,
    tier: session.user.subscriptionTier,
    data: body
  });
})

// Protected POST with multiple middleware
interface SessionUser {
  id: string;
  email: string;
  subscriptionTier: string;
}

interface Session {
  user: SessionUser;
}

export const POST = compose(
  withRateLimit(20),
  withUsageCheck('create_project'),
  withSubscription('pro'),
  withAuth
)(async (
  req: NextRequest,
  context: { params: Record<string, unknown>; session?: Session }
) => {
  const session = context.session;
  const body = await req.json();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ 
    message: 'All checks passed!',
    userId: session.user.id,
    tier: session.user.subscriptionTier,
    data: body
  });
})

// Admin-only DELETE
export const DELETE = withAdmin(async (req, context, session) => {
  return NextResponse.json({ 
    message: 'Admin action performed',
    adminEmail: session.user.email
  })
})
