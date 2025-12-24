import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user to verify ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the project
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate a unique slug for the project
    const baseSlug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check if slug already exists, if so append random string
    let slug = baseSlug;
    const existingProject = await prisma.project.findFirst({
      where: {
        publicSlug: slug,
        id: { not: project.id }
      }
    });
    
    if (existingProject) {
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }
    
    // Mark project as published and create public URL
    const publishedProject = await prisma.project.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publicSlug: slug,
        publicUrl: `https://buildflow-ai.app/sites/${slug}`,
      },
      select: { publicUrl: true }
    });

    return NextResponse.json({
      success: true,
      url: publishedProject.publicUrl,
      message: 'Project published successfully!',
    });

  } catch (error: any) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish' },
      { status: 500 }
    );
  }
}
