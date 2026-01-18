import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeSession } from '@/lib/security'

// DELETE /api/user/sessions/[sessionId] - Revoke a specific session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

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
