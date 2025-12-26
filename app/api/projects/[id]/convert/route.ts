import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { User: true }
    })

    if (!project || project.User.email !== session.user.email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check if it's React/TSX code
    if (project.code.includes('```tsx') || project.code.includes('```jsx')) {
      return NextResponse.json({
        message: 'This is a React project. Please regenerate it using the AI Chat.',
        canConvert: false
      })
    }

    return NextResponse.json({
      message: 'Project is already in HTML format',
      canConvert: false
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}