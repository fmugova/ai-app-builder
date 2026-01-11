import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveSessions, revokeAllUserSessions } from '@/lib/security'

// GET /api/user/sessions - Get all active sessions for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeSessions = await getActiveSessions(session.user.id)

    // Format sessions for client
    const formattedSessions = activeSessions.map(s => ({
      id: s.id,
      sessionToken: s.sessionToken,
      deviceType: s.deviceType || 'desktop',
      deviceName: s.deviceName || 'Unknown Device',
      ipAddress: s.ipAddress || 'Unknown',
      location: s.location || null,
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: false, // TODO: Compare with current session token
    }))

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST /api/user/sessions/revoke-all - Revoke all other sessions
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const revokedCount = await revokeAllUserSessions(session.user.id)

    return NextResponse.json({
      success: true,
      revokedCount,
      message: `${revokedCount} session(s) revoked successfully`
    })
  } catch (error) {
    console.error('Failed to revoke sessions:', error)
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    )
  }
}
