export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { withAdmin } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'




export const PATCH = withAdmin(async (req: NextRequest) => {
  const body = await req.json()
  const { userId, role, subscriptionTier } = body
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role, subscriptionTier },
  })
  return NextResponse.json({ success: true, user })
})

export const GET = withAdmin(async () => {
  // Count users in both public.User and auth.users
  const [publicUserCount, authUserCount] = await Promise.all([
    prisma.user.count(),
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM auth.users WHERE deleted_at IS NULL`
  ]);
  // Query the auth.users table for details
  const users = await prisma.$queryRaw`\
    SELECT id, email, role, created_at as "createdAt"
    FROM auth.users
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  return NextResponse.json({
    users,
    dashboardUserCount: Math.max(publicUserCount, authUserCount[0]?.count || 0)
  });
});
