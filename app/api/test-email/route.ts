export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getWelcomeEmailHTML } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const result = await sendEmail({
      to: 'fmugova@yahoo.com',
      subject: 'Test Email from BuildFlow',
      html: getWelcomeEmailHTML('Test User')
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
