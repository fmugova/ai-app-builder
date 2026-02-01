// app/api/projects/[id]/endpoints/templates/route.ts
// Get available templates

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const templates = await prisma.apiTemplate.findMany({
      where: {
        isActive: true,
        ...(category && { category })
      },
      orderBy: { usageCount: 'desc' }
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
