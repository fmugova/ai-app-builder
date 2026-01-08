import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const addProjectSchema = z.object({
  projectId: z.string(),
  permission: z.enum(['view', 'edit']).default('edit'),
});

// Helper to check if user has permission
async function checkWorkspacePermission(
  workspaceId: string,
  userId: string,
  requiredRole?: 'owner' | 'admin'
) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!member) {
    return { hasPermission: false, member: null };
  }

  if (requiredRole === 'owner') {
    return { hasPermission: member.role === 'owner', member };
  }

  if (requiredRole === 'admin') {
    return { hasPermission: member.role === 'owner' || member.role === 'admin', member };
  }

  return { hasPermission: true, member };
}

// GET /api/workspaces/[id]/projects - Get all projects in workspace
export async function GET(
  req: NextRequest,
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

    const { hasPermission } = await checkWorkspacePermission(params.id, user.id);

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const projects = await prisma.workspaceProject.findMany({
      where: { workspaceId: params.id },
      include: {
        // Note: We'll need to add a relation to the Project model later
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching workspace projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace projects' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/projects - Add project to workspace
export async function POST(
  req: NextRequest,
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

    const { hasPermission } = await checkWorkspacePermission(params.id, user.id, 'admin');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only admins and owners can add projects to workspace' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = addProjectSchema.parse(body);

    // Check if project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project already in workspace
    const existingProject = await prisma.workspaceProject.findUnique({
      where: {
        workspaceId_projectId: {
          workspaceId: params.id,
          projectId: validatedData.projectId,
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'Project already in workspace' },
        { status: 400 }
      );
    }

    // Check workspace project limit
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (workspace && workspace._count.projects >= workspace.projectsLimit) {
      return NextResponse.json(
        { error: 'Workspace project limit reached' },
        { status: 400 }
      );
    }

    const workspaceProject = await prisma.workspaceProject.create({
      data: {
        workspaceId: params.id,
        projectId: validatedData.projectId,
        permission: validatedData.permission,
        addedBy: user.id,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'workspace',
        action: 'project_added',
        metadata: {
          workspaceId: params.id,
          projectId: validatedData.projectId,
          projectName: project.name,
        },
      },
    });

    return NextResponse.json({ workspaceProject }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error adding project to workspace:', error);
    return NextResponse.json(
      { error: 'Failed to add project to workspace' },
      { status: 500 }
    );
  }
}
