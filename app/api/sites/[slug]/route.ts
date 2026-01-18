import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find the published project
    const project = await prisma.project.findFirst({
      where: {
        publicSlug: slug,
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        createdAt: true,
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Increment view count (don't await to keep it fast)
    prisma.project.update({
      where: { id: project.id },
      data: { views: { increment: 1 } },
    }).catch(console.error);

    return NextResponse.json(project);

  } catch (error: unknown) {
    console.error('❌ Site fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load site' },
      { status: 500 }
    );
  }
}
