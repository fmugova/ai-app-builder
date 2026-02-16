import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        userId: true,
        isPublic: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only the owner (or admins) can access private projects
    if (!project.isPublic && project.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!project.code) {
      return NextResponse.json({ error: 'Project has no generated code' }, { status: 404 });
    }

    return NextResponse.json({
      code: project.code,
      projectName: project.name,
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
