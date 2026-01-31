// app/api/example/route.ts
// ✅ FIXED: Removed compose middleware to match Next.js 15

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Simple authenticated route - no middleware composition
export async function GET(
  req: NextRequest,
  context: { params: Promise<object>; }  // ✅ Next.js 15 signature
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check subscription tier manually
  if (session.user.subscriptionTier !== 'pro' && session.user.subscriptionTier !== 'enterprise') {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
  }
  
  return NextResponse.json({
    message: 'Success',
    userId: session.user.id,
    tier: session.user.subscriptionTier
  });
}

// POST with manual checks
export async function POST(
  req: NextRequest,
  context: { params: Promise<object> }  // ✅ Next.js 15 signature
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check subscription tier
  if (session.user.subscriptionTier !== 'pro' && session.user.subscriptionTier !== 'enterprise') {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
  }
  
  const body = await req.json();

  return NextResponse.json({ 
    message: 'All checks passed!',
    userId: session.user.id,
    tier: session.user.subscriptionTier,
    data: body
  });
}

// Admin-only DELETE
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<object> }  // ✅ Next.js 15 signature
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check admin role
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  return NextResponse.json({ 
    message: 'Admin action performed',
    adminEmail: session.user.email
  });
}
