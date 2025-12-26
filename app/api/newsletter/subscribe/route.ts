import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, getWelcomeEmailHTML } from '@/lib/email'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, name, source } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email }
    })

    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Resubscribe
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            status: 'active',
            subscribedAt: new Date(),
            unsubscribedAt: null,
            name: name || existing.name
          }
        })
        
        return NextResponse.json({ 
          success: true, 
          message: 'Welcome back! You have been resubscribed.' 
        })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'You are already subscribed!' 
      })
    }

    // Create new subscriber
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        name,
        source: source || 'website',
        status: 'active',
        preferences: {
          frequency: 'weekly',
          topics: ['updates', 'tips']
        }
      }
    })

    // Send welcome email
    await sendEmail({
      to: email,
      subject: '✉️ You\'re subscribed to BuildFlow Newsletter!',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
              <h1 style="color: #667eea; margin-bottom: 20px;">🎉 Welcome to BuildFlow Newsletter!</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Hi${name ? ` ${name}` : ''}! 👋
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thanks for subscribing! You'll now receive:
              </p>
              <ul style="color: #666; font-size: 16px; line-height: 1.8;">
                <li>Weekly product updates and new features</li>
                <li>Tips & tricks to build better apps</li>
                <li>Exclusive early access to new releases</li>
                <li>Special offers and promotions</li>
              </ul>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                You can unsubscribe at any time by clicking the link in our emails.
              </p>
            </div>
          </body>
        </html>
      `,
      from: 'BuildFlow <newsletter@buildflow-ai.app>'
    }).catch(err => console.error('Newsletter welcome email failed:', err))

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed! Check your email.' 
    })

  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}