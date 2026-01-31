import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  // Email verification temporarily disabled for login
  return NextResponse.json({ success: true, message: 'Email verification bypassed.' })
}
