// app/api/projects/[id]/env-vars/[varId]/route.ts
// Delete individual environment variable

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/security'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; varId: string }> }) {
  const { id, varId } = await context.params;
  try {
    // Verify ownership
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const variable = await prisma.environmentVariable.findFirst({
      where: {
        id: varId,
        Project: {
          id: id,
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
      where: { id: varId }
    })

    // Log security event
    if (user) {
      await logSecurityEvent({
        userId: user.id,
        type: 'env_var_deleted',
        action: 'success',
        metadata: {
          projectId: id,
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
