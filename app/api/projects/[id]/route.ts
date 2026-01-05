import { authOptions } from '@/lib/auth';
import { compose, withAuth, withResourceOwnership, withRateLimit } from '@/lib/api-middleware'
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET single project
export const GET = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const project = await prisma.project.findUnique({
    where: { id: context.params.id },
    include: {
      pages: true,
      customDomains: true,
    },
  })
  
  return NextResponse.json({ project })
})

// UPDATE project
export const PUT = compose(
  withRateLimit(30),
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  const project = await prisma.project.update({
    where: { id: context.params.id },
    data: body,
  })
  
  return NextResponse.json({ project })
})

// DELETE project
export const DELETE = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  // User ownership verified!
  await prisma.project.delete({
    where: { id: context.params.id },
  })
  
  return NextResponse.json({ success: true })
})