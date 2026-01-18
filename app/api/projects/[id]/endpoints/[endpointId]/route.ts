// app/api/projects/[id]/endpoints/[endpointId]/route.ts
// Individual endpoint operations

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - Delete endpoint
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; endpointId: string } }
) {
  const { id, endpointId } = params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const endpoint = await prisma.apiEndpoint.findFirst({
      where: {
        id: endpointId,
        project: {
          id: id,
          User: { email: session.user.email }
        }
      }
    })

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }

    await prisma.apiEndpoint.delete({
      where: { id: endpointId }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to delete endpoint' },
      { status: 500 }
    )
  }
}
