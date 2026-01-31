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
  const session = await getServerSession(authOptions);

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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground mt-2">
            Collaborate with your team on projects
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {workspaces.length === 0 ? (
        <WorkspaceEmptyState />
      ) : (
        <WorkspaceGrid workspaces={workspaces} />
      )}
    </div>
  );
}
