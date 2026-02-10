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
  try {
    // Fetch users from the public User table with all their data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        generationsUsed: true,
        generationsLimit: true,
        projectsLimit: true,
        createdAt: true,
        _count: {
          select: {
            Project: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the expected format
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      subscriptionTier: user.subscriptionTier || 'free',
      subscriptionStatus: user.subscriptionStatus || 'active',
      generationsUsed: user.generationsUsed ? Number(user.generationsUsed) : 0,
      generationsLimit: user.generationsLimit ? Number(user.generationsLimit) : 10,
      projectsLimit: user.projectsLimit ? Number(user.projectsLimit) : 3,
      projectCount: user._count.Project || 0,
      projectsThisMonth: 0, // TODO: Calculate from Project.createdAt
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({
      users: transformedUsers,
      dashboardUserCount: users.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', users: [] },
      { status: 500 }
    );
  }
});
