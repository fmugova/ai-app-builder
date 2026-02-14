import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  CreateWorkspaceDialog,
  WorkspaceGrid,
  WorkspaceEmptyState,
} from './components/WorkspacesClientComponents';

export default async function WorkspacesPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  type WorkspaceWithCounts = {
    id: string;
    name: string;
    description: string | null;
    subscriptionTier: string;
    // Add other Workspace fields as needed
    _count: {
      WorkspaceMember: number;
      WorkspaceProject: number;
    };
  };

  type WorkspaceMemberWithWorkspace = {
    role: string;
    Workspace: WorkspaceWithCounts;
    // Add other WorkspaceMember fields as needed
  };

  const workspaceMembers = await prisma.workspaceMember.findMany({
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

  const workspaces = workspaceMembers.map((wm: WorkspaceMemberWithWorkspace) => ({
    id: wm.Workspace.id,
    name: wm.Workspace.name,
    description: wm.Workspace.description ?? '',
    subscriptionTier: wm.Workspace.subscriptionTier ?? '',
    _count: wm.Workspace._count,
    userRole: wm.role,
    memberCount: wm.Workspace._count.WorkspaceMember,
    projectCount: wm.Workspace._count.WorkspaceProject,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4 hover:bg-white/50 dark:hover:bg-gray-800/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Workspaces
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Collaborate with your team on projects
                </p>
                {workspaces.length > 0 && (
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">{workspaces.length}</strong> workspace{workspaces.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">
                          {workspaces.reduce((sum, w) => sum + w.projectCount, 0)}
                        </strong> total projects
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <CreateWorkspaceDialog />
            </div>
          </div>
        </div>

        {/* Content */}
        {workspaces.length === 0 ? (
          <WorkspaceEmptyState />
        ) : (
          <WorkspaceGrid workspaces={workspaces} />
        )}
      </div>
    </div>
  );
}
