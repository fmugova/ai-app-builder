import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
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

// POST /api/workspaces/[id]/members/invite - Invite a member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Only admins and owners can invite members
    const { hasPermission } = await checkWorkspacePermission(id, user.id, 'admin');

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = inviteMemberSchema.parse(body);

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: id as string },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check member limit
    if (workspace._count.members >= workspace.membersLimit) {
      return NextResponse.json(
        { error: 'Workspace member limit reached' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: id,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.workspaceInvite.findFirst({
      where: {
        workspaceId: id,
        email: validatedData.email,
        status: 'pending',
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      );
    }

    // Create invite token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId: id,
        email: validatedData.email,
        role: validatedData.role,
        token,
        invitedBy: user.id,
        expiresAt,
      },
    });

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/workspaces/accept-invite?token=${token}`;
    
    try {
      await sendEmail({
        to: validatedData.email,
        subject: `You've been invited to join ${workspace.name}`,
        html: `
          <h2>Workspace Invitation</h2>
          <p>${user.name || user.email} has invited you to join the workspace "${workspace.name}".</p>
          <p>Role: ${validatedData.role}</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${inviteUrl}">${inviteUrl}</a>
          <p>This invitation will expire on ${expiresAt.toLocaleDateString()}.</p>
        `,
      });
    } catch (emailError) {
      console.error('Error sending invite email:', emailError);
      // Continue even if email fails
    }

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'workspace',
        action: 'member_invited',
        metadata: {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          invitedEmail: validatedData.email,
          role: validatedData.role,
        },
      },
    });

    return NextResponse.json({ 
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
