export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
      const feedback = await prisma.feedback.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json(feedback)
    } catch (error) {
      // Table doesn't exist yet, return empty array
      console.log('Feedback table not found, returning empty array')
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json([])
  }
}