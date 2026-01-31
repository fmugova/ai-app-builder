import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email }
    })

    if (!subscriber) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    if (subscriber.status === 'unsubscribed') {
      return NextResponse.json({ 
        success: true, 
        message: 'Already unsubscribed' 
      })
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully unsubscribed. Sorry to see you go!' 
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 })
  }
}
