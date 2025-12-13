export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { userIds, subscriptionTier, projectsLimit, generationsLimit } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 })
    }

    // Build update data
    const updateData: any = {}
    if (subscriptionTier) updateData.subscriptionTier = subscriptionTier
    if (projectsLimit) updateData.projectsLimit = projectsLimit
    if (generationsLimit) updateData.generationsLimit = generationsLimit

    // Update multiple users
    const result = await prisma.user.updateMany({
      where: {
        id: {
          in: userIds
        }
      },
      data: updateData
    })

    // Get admin user ID
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    // Log activity
    if (adminUser) {
      await prisma.activity.create({
        data: {
          userId: adminUser.id,
          type: 'bulk_update',
          action: 'Bulk User Update',
          metadata: {
            userCount: userIds.length,
            updates: updateData
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      updated: result.count
    })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json(
      { error: 'Failed to update users' },
      { status: 500 }
    )
  }
}