import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

  try {
    // Rate limiting - use IP address for 2FA check
    const rateLimit = await checkRateLimit(req, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many 2FA attempts. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }
    // ...existing code...
    const { email, password } = await req.json()
    // ...existing code...
}
