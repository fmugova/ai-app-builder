export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { subscriptionTier, projectsLimit, generationsLimit, role } = body

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        subscriptionTier,
        projectsLimit,
        generationsLimit,
        role,
        updatedAt: new Date()
      }
    })

    // Get admin user ID
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    // Log activity using YOUR existing schema (type, action, metadata)
    if (adminUser) {
      await prisma.activity.create({
        data: {
          userId: adminUser.id,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    // Get user email before deleting
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user (this will cascade delete related records)
    await prisma.user.delete({
      where: { id }
    })

    // Get admin user ID
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    // Log activity using YOUR existing schema (type, action, metadata)
    if (adminUser) {
      await prisma.activity.create({
        data: {
          userId: adminUser.id,
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