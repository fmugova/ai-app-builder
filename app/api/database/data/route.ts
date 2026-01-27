import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase-integration'
import { checkApiTemplateNameDuplicates, checkDatabaseConnectionProjectIdDuplicates } from '@/lib/database-helpers'

export const dynamic = 'force-dynamic'

// Only export HTTP handlers:
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'GET not implemented' }, { status: 501 });
}
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'POST not implemented' }, { status: 501 });
}
export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: 'PATCH not implemented' }, { status: 501 });
}
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: 'DELETE not implemented' }, { status: 501 });
}

// Do NOT export the helpers from this file!