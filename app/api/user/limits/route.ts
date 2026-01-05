import { withAuth } from '@/lib/api-middleware'
import { getUserLimits } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (req, context, session) => {
  try {
    const limits = await getUserLimits(session.user.id)
    return NextResponse.json(limits)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
      { status: 500 }
    )
  }
})
