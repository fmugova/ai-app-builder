import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { User: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (project.User.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this project' },
        { status: 403 }
      );
    }

    // Check if already unpublished
    if (!project.isPublished) {
      return NextResponse.json(
        { error: 'Project is already unpublished' },
        { status: 400 }
      );
    }

    // Unpublish the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        isPublished: false,
        status: 'DRAFT',
        // Keep publicSlug and publishedAt for history, but mark as unpublished
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project unpublished successfully',
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        isPublished: updatedProject.isPublished,
        status: updatedProject.status,
      },
    });
  } catch (error) {
    console.error('Error unpublishing project:', error);
    return NextResponse.json(
      { error: 'Failed to unpublish project' },
      { status: 500 }
    );
  }
}
