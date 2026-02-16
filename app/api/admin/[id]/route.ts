export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin (use DB role, not email allowlist)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { subscriptionTier, projectsLimit, generationsLimit, role } = body

    // Validate role to prevent arbitrary string injection
    const VALID_ROLES = ['admin', 'user']
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 })
    }

    // Validate subscriptionTier
    const VALID_TIERS = ['free', 'pro', 'business', 'enterprise']
    if (subscriptionTier !== undefined && !VALID_TIERS.includes(subscriptionTier)) {
      return NextResponse.json({ error: 'Invalid subscriptionTier value' }, { status: 400 })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: {
        subscriptionTier,
        projectsLimit,
        generationsLimit,
        role,
        updatedAt: new Date()
      }
    })

    // Log activity using YOUR existing schema (type, action, metadata)
    if (session.user.id) {
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          type: 'user_update',
          action: 'User Updated',
          metadata: {
            targetEmail: updatedUser.email,
            subscriptionTier,
            projectsLimit,
            generationsLimit,
            role
          }
        }
      })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}


export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin (use DB role, not email allowlist)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await context.params

    // Get user email before deleting
    const user = await prisma.user.findUnique({
      where: { id: id as string },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user (this will cascade delete related records)
    await prisma.user.delete({
      where: { id: id as string }
    })

    // Log activity using YOUR existing schema (type, action, metadata)
    if (session.user.id) {
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          type: 'user_delete',
          action: 'User Deleted',
          metadata: {
            email: user.email
          }
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
