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
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      projectsThisMonth: true,
      generationsUsed: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ users })
})
