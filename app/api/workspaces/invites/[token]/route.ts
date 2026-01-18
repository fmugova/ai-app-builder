import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/workspaces/invites/[token] - Get invite details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            slug: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

    return NextResponse.json({ 
      invite: {
        email: invite.email,
        role: invite.role,
        workspace: invite.workspace,
        expiresAt: invite.expiresAt,
      }
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/invites/[token]/accept - Accept invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
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

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

    if (invite.email !== user.email) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 400 }
      );
    }

    // Add user to workspace and update invite
    const [member] = await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        },
        include: {
          workspace: true,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      }),
    ]);

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'workspace',
        action: 'member_joined',
        metadata: {
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspace.name,
          role: invite.role,
        },
      },
    });

    return NextResponse.json({ 
      workspace: member.workspace,
      role: member.role,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
