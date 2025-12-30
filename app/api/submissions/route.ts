import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  const submissions = await prisma.formSubmission.findMany({
    where: { userId: user.id },
    include: { site: true },
    orderBy: { submittedAt: 'desc' },
    take: 100
  })
  
  return NextResponse.json(submissions)
}