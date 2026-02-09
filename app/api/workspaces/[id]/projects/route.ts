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
interface IdParamContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: IdParamContext
) {
  const { id } = await context.params;
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

    const { hasPermission } = await checkWorkspacePermission(id, user.id);

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Helper to serialize BigInt fields in project
    const projects = await prisma.workspaceProject.findMany({
      where: { workspaceId: id },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
            description: true,
            html: true,
            css: true,
            code: true,
            jsCode: true,
            javascript: true,
            status: true,
            userId: true,
            validationScore: true,
            generationTime: true,
            retryCount: true,
            tokensUsed: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    function serializeProject(workspaceProject: {
      id: string;
      workspaceId: string;
      projectId: string;
      permission: string;
      addedBy: string | null;
      addedAt: Date;
      project?: {
        id: string;
        name: string;
        description: string | null;
        html: string | null;
        css: string | null;
        code: string | null;
        jsCode: string | null;
        javascript: string | null;
        status: string;
        userId: string;
        validationScore: number | bigint | null;
        generationTime: number | bigint | null;
        retryCount: number | bigint | null;
        tokensUsed: number | bigint | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    }) {
      if (!workspaceProject.project) return workspaceProject;
      return {
        ...workspaceProject,
        project: {
          ...workspaceProject.project,
          generationTime: workspaceProject.project.generationTime ? Number(workspaceProject.project.generationTime) : null,
          retryCount: workspaceProject.project.retryCount ? Number(workspaceProject.project.retryCount) : null,
          tokensUsed: workspaceProject.project.tokensUsed ? Number(workspaceProject.project.tokensUsed) : null,
          validationScore: workspaceProject.project.validationScore ? Number(workspaceProject.project.validationScore) : null,
        }
      };
    }
    const serializedProjects = projects.map(serializeProject);
    return NextResponse.json({ projects: serializedProjects });
  } catch (error) {
    console.error('Error fetching workspace projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace projects' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: IdParamContext
) {
  const { id } = await context.params;
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

    // 🟡 User-based write rate limit
    const rateLimit = await (await import('@/lib/rate-limit')).checkRateLimit(req, 'write', user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Please slow down',
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    // ...existing code...
    const { hasPermission } = await checkWorkspacePermission(id, user.id, 'admin');

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
          workspaceId: id,
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
    const workspaceData = await prisma.workspace.findUnique({
      where: { id: id as string },
      include: {
        _count: {
          select: { WorkspaceProject: true },
        },
      },
    });

    if (workspaceData && workspaceData._count.WorkspaceProject >= workspaceData.projectsLimit) {
      return NextResponse.json(
        { error: 'Workspace project limit reached' },
        { status: 400 }
      );
    }

    const workspaceProject = await prisma.workspaceProject.create({
      data: {
        workspaceId: id,
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
          workspaceId: id,
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
