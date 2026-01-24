import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
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

// PATCH /api/workspaces/[id]/members/[memberId] - Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
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

    const body = await req.json();
    const validatedData = updateMemberSchema.parse(body);

    // Get the member to be updated
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Only owners can change roles
    const { hasPermission } = await checkWorkspacePermission(
      id,
      user.id,
      'owner'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only workspace owners can change member roles' },
        { status: 403 }
      );
    }

    // Prevent changing own role
    if (targetMember.userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // If changing to owner, ensure there's at least one owner
    if (targetMember.role === 'owner' && validatedData.role !== 'owner') {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId: id,
          role: 'owner',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Workspace must have at least one owner' },
          { status: 400 }
        );
      }
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: validatedData.role },
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
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'workspace',
        action: 'member_role_updated',
        metadata: {
          workspaceId: id,
          memberId: memberId,
          memberEmail: updatedMember.User.email,
          oldRole: targetMember.role,
          newRole: validatedData.role,
        },
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
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

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember || targetMember.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user is removing themselves or has admin permission
    const isSelf = targetMember.userId === user.id;
    
    if (!isSelf) {
      const { hasPermission } = await checkWorkspacePermission(
        id,
        user.id,
        'admin'
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Only admins and owners can remove members' },
          { status: 403 }
        );
      }
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner') {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId: id,
          role: 'owner',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner of the workspace' },
          { status: 400 }
        );
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'workspace',
        action: isSelf ? 'member_left' : 'member_removed',
        metadata: {
          workspaceId: id,
          memberId: memberId,
          memberEmail: targetMember.User.email,
          role: targetMember.role,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
