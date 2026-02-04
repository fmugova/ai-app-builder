import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Next.js 15: params is now a Promise
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id } = await context.params;

    // Fetch project from database
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    // Project not found
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Project has no code
    if (!project.code) {
      return NextResponse.json(
        { error: 'Project has no generated code' },
        { status: 404 }
      );
    }

    // Return project data
    return NextResponse.json({
      code: project.code,
      projectName: project.name,
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}