import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeSession } from '@/lib/security'
import { prisma } from '@/lib/prisma'

// DELETE /api/user/sessions/[sessionId] - Revoke a specific session
interface SessionParamContext {
  params: Promise<{ sessionId: string }>;
}

export async function DELETE(
  request: Request,
  context: SessionParamContext
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await context.params

    // Verify the target session belongs to the authenticated user (IDOR prevention)
    const activeSession = await prisma.activeSession.findFirst({
      where: { sessionToken: sessionId, userId: session.user.id }
    })

    if (!activeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Revoke the session
    await revokeSession(sessionId, 'User requested revocation')

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully'
    })
  } catch (error) {
    console.error('Failed to revoke session:', error)
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    )
  }
}
