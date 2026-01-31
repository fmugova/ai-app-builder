import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

// GET /api/workspaces - Get all workspaces for the current user
import type { Session } from 'next-auth';

async function getUserFromSession(session: Session | null) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized or user not found' }, { status: 401 });
    }
    // Get all workspaces where user is a member
    const workspaceMemberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        Workspace: {
          include: {
            _count: {
              select: {
                WorkspaceMember: true,
                WorkspaceProject: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });
    const Workspaces = workspaceMemberships.map((wm: typeof workspaceMemberships[number]) => ({
      ...wm.Workspace,
      userRole: wm.role,
      memberCount: wm.Workspace._count.WorkspaceMember,
      projectCount: wm.Workspace._count.WorkspaceProject,
    }));
    return NextResponse.json({ Workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized or user not found' }, { status: 401 });
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
    const body = await req.json();
    const validatedData = createWorkspaceSchema.parse(body);
    // Check if slug is already taken
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: validatedData.slug },
    });
    if (existingWorkspace) {
      return NextResponse.json(
        { error: 'Workspace slug already taken' },
        { status: 400 }
      );
    }
    // Create workspace and add creator as owner
    const workspaceData = await prisma.workspace.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        WorkspaceMember: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
      include: {
        WorkspaceMember: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });
    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'workspace',
        action: 'created',
        metadata: {
          workspaceId: workspaceData.id,
          workspaceName: workspaceData.name,
        },
      },
    });
    return NextResponse.json({ workspace: workspaceData }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
