import prisma from '@/lib/prisma';

/**
 * Check if a user has access to a workspace
 */
export async function checkWorkspaceAccess(
  workspaceId: string,
  userId: string,
  requiredRole?: 'owner' | 'admin' | 'member'
): Promise<{ hasAccess: boolean; role?: string }> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!member) {
    return { hasAccess: false };
  }

  if (!requiredRole) {
    return { hasAccess: true, role: member.role };
  }

  const roleHierarchy: Record<string, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  const hasAccess =
    roleHierarchy[member.role] >= roleHierarchy[requiredRole];

  return { hasAccess, role: member.role };
}

/**
 * Check if a user has access to a project through workspace membership
 */
export async function checkProjectAccessThroughWorkspace(
  projectId: string,
  userId: string
): Promise<{ hasAccess: boolean; permission?: string }> {
  // Find all workspaces that have this project
  const workspaceProjects = await prisma.workspaceProject.findMany({
    where: { projectId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  // Check if user is a member of any workspace containing this project
  for (const wp of workspaceProjects) {
    if (wp.workspace.members.length > 0) {
      return { hasAccess: true, permission: wp.permission };
    }
  }

  return { hasAccess: false };
}

/**
 * Get all workspaces a user belongs to
 */
export async function getUserWorkspaces(userId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  return members.map((m) => ({
    ...m.workspace,
    userRole: m.role,
    memberCount: m.workspace._count.members,
    projectCount: m.workspace._count.projects,
  }));
}

/**
 * Check if workspace has capacity for more members
 */
export async function canAddMember(workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  if (!workspace) {
    return false;
  }

  return workspace._count.members < workspace.membersLimit;
}

/**
 * Check if workspace has capacity for more projects
 */
export async function canAddProject(workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  });

  if (!workspace) {
    return false;
  }

  return workspace._count.projects < workspace.projectsLimit;
}

/**
 * Get workspace usage stats
 */
export async function getWorkspaceUsage(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: {
          members: true,
          projects: true,
        },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  return {
    members: {
      used: workspace._count.members,
      limit: workspace.membersLimit,
      percentage: (workspace._count.members / workspace.membersLimit) * 100,
    },
    projects: {
      used: workspace._count.projects,
      limit: workspace.projectsLimit,
      percentage: (workspace._count.projects / workspace.projectsLimit) * 100,
    },
    generations: {
      used: workspace.generationsUsed,
      limit: workspace.generationsLimit,
      percentage: (workspace.generationsUsed / workspace.generationsLimit) * 100,
    },
  };
}
