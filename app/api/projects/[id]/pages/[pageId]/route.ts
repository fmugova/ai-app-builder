
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

interface MultipleParamsContext {
  params: Promise<{ id: string; pageId: string }>;
}

export const dynamic = 'force-dynamic';

// GET - Get single page
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const { id, pageId } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const page = await prisma.page.findFirst({
      where: { id: pageId, projectId: id },
    });
    if (!page) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error: unknown) {
    console.error('GET error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch page';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


// PUT - Update page
export async function PUT(
  request: NextRequest,
  context: MultipleParamsContext
) {
  try {
    const { id, pageId } = await context.params;
    const body = await request.json();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update the page
    const updated = await prisma.page.update({
      where: { id: pageId, projectId: id },
      data: body
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('PUT error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update page';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


// DELETE - Delete page
export async function DELETE(
  request: NextRequest,
  context: MultipleParamsContext
) {
  try {
    const { id, pageId } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.page.delete({ where: { id: pageId, projectId: id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to delete page';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}