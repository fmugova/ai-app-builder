import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper to generate unique slug
function generateSlug(projectName: string, projectId: string): string {
  const cleanName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  const shortId = projectId.substring(0, 8);
  return `${cleanName}-${shortId}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = params;

    // Get the project and verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate slug for publishing
    const slug = generateSlug(project.name, project.id);
    
    // Update project as published
    const publishedProject = await prisma.project.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publicSlug: slug,
        publicUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow-ai.app'}/sites/${slug}`,
      },
      select: { publicUrl: true, publicSlug: true }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'project',
        action: 'published',
        metadata: {
          projectId: project.id,
          projectName: project.name,
          publicUrl: publishedProject.publicUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: publishedProject.publicUrl,
      slug: publishedProject.publicSlug,
      message: 'Project published successfully! 🎉',
    });

  } catch (error: any) {
    console.error('❌ Publish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish' },
      { status: 500 }
    );
  }
}

// Unpublish endpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = params;

    // Update project as unpublished
    await prisma.project.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isPublished: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project unpublished',
    });

  } catch (error: any) {
    console.error('❌ Unpublish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unpublish' },
      { status: 500 }
    );
  }
}
