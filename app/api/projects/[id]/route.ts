import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware' // ✅ Correct import
import { nanoid } from 'nanoid'
import { authOptions } from '@/lib/auth' // Adjust the path if your authOptions is elsewhere
import { getServerSession } from 'next-auth/next'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET single project
export const GET = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  session: { user: { id: string } }
) => {
  try {
    const { id } = await context.params;
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        pages: true,
        customDomains: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('GET project error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
})

// PUBLISH project (PUT method)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        code: body.code,
        type: body.type,
      }
    });

    await prisma.activity.create({
      data: {
        action: 'updated',
        userId: session.user.id,
        type: 'project', // or another appropriate string value for your use case
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE project
export const DELETE = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  session: { user: { id: string } }
) => {
  try {
    // Check ownership
    const { id } = await context.params;
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project
    await prisma.project.delete({
      where: { id: id as string }
    })

    console.log('✅ Project deleted:', id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE project error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
})