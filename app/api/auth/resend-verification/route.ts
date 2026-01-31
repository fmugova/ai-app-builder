import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

  try {
    // Rate limiting - use IP address for resend-verification
    const rateLimit = await checkRateLimit(request, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many verification requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }
    // ...existing code...
    const { email } = await request.json()
    // ...existing code...
}
