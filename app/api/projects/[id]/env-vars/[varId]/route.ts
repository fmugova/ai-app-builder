// app/api/projects/[id]/env-vars/[varId]/route.ts
// Delete individual environment variable

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/security'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; varId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const variable = await prisma.environmentVariable.findFirst({
      where: {
        id: params.varId,
        project: {
          id: params.id,
          User: { email: session.user.email }
        }
      }
    })

    if (!variable) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 })
    }

    // Get user for logging
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    // Delete variable
    await prisma.environmentVariable.delete({
      where: { id: params.varId }
    })

    // Log security event
    if (user) {
      await logSecurityEvent({
        userId: user.id,
        type: 'env_var_deleted',
        action: 'success',
        metadata: {
          projectId: params.id,
          key: variable.key,
          environment: variable.environment
        },
        severity: 'warning'
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete env var error:', error)
    return NextResponse.json(
      { error: 'Failed to delete environment variable' },
      { status: 500 }
    )
  }
}
