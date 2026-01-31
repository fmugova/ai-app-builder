import { checkRateLimit } from '@/lib/rate-limit'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

  try {
    // Rate limiting - use IP address for register
    const rateLimit = await checkRateLimit(request, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }
    // ...existing code...
    const body = await request.json();
    // ...existing code...
}
