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
      Workspace: {
        include: {
          WorkspaceMember: {
            where: { userId },
          },
        },
      },
    },
  });

  // Check if user is a member of any workspace containing this project
  for (const wp of workspaceProjects) {
    if (wp.Workspace.WorkspaceMember.length > 0) {
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

  return members.map((m: typeof members[number]) => ({
    ...m.Workspace,
    userRole: m.role,
    memberCount: m.Workspace._count.WorkspaceMember,
    projectCount: m.Workspace._count.WorkspaceProject,
  }));
}

/**
 * Check if workspace has capacity for more members
 */
export async function canAddMember(workspaceId: string): Promise<boolean> {
  const Workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: { WorkspaceMember: true },
      },
    },
  });

  if (!Workspace) {
    return false;
  }

  return Workspace._count.WorkspaceMember < Workspace.membersLimit;
}

/**
 * Check if workspace has capacity for more projects
 */
export async function canAddProject(workspaceId: string): Promise<boolean> {
  const Workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: { WorkspaceProject: true },
      },
    },
  });

  if (!Workspace) {
    return false;
  }

  return Workspace._count.WorkspaceProject < Workspace.projectsLimit;
}

/**
 * Get workspace usage stats
 */
export async function getWorkspaceUsage(workspaceId: string) {
  const Workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: {
          WorkspaceMember: true,
          WorkspaceProject: true,
        },
      },
    },
  });

  if (!Workspace) {
    return null;
  }

  return {
    WorkspaceMember: {
      used: Workspace._count.WorkspaceMember,
      limit: Workspace.membersLimit,
      percentage: (Workspace._count.WorkspaceMember / Workspace.membersLimit) * 100,
    },
    projects: {
      used: Workspace._count.WorkspaceProject,
      limit: Workspace.projectsLimit,
      percentage: (Workspace._count.WorkspaceProject / Workspace.projectsLimit) * 100,
    },
    generations: {
      used: Workspace.generationsUsed,
      limit: Workspace.generationsLimit,
      percentage: (Workspace.generationsUsed / Workspace.generationsLimit) * 100,
    },
  };
}
