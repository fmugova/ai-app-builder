import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, slug } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate slug from project name if not provided
    let publishSlug = slug;
    if (!publishSlug) {
      publishSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      // Add random suffix to ensure uniqueness
      publishSlug = `${publishSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Check if slug is already taken
    const existingPublish = await prisma.project.findFirst({
      where: {
        publicSlug: publishSlug,
        NOT: { id: projectId }
      }
    });

    if (existingPublish) {
      // Add random suffix if slug is taken
      publishSlug = `${publishSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Update project with slug and publish status
    const updatedProject = await prisma.project.update({
      where: { id: projectId, userId: user.id },
      data: {
        publicSlug: publishSlug,
        isPublished: true,
        publishedAt: new Date(),
        status: 'PUBLISHED',
      },
    });

    // Construct the published URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publishedUrl = `${baseUrl}/p/${publishSlug}`;

    console.log('✅ Project published to BuildFlow:', publishSlug);

    return NextResponse.json({
      success: true,
      url: publishedUrl,
      slug: publishSlug,
      message: 'Published successfully to BuildFlow!',
    });

  } catch (error) {
    console.error('BuildFlow publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish to BuildFlow' },
      { status: 500 }
    );
  }
}
