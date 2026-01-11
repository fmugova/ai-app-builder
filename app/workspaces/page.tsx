import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import WorkspaceGridSkeleton from './workspace-grid-skeleton';

// Lazy load heavy components
const CreateWorkspaceDialog = dynamic(
  () => import('@/components/CreateWorkspaceDialog').then(mod => ({ default: mod.CreateWorkspaceDialog })),
  {
    loading: () => null,
    ssr: false
  }
);

const WorkspaceGrid = dynamic(() => import('./workspace-grid'), {
  loading: WorkspaceGridSkeleton,
  ssr: false
});

const WorkspaceEmptyState = dynamic(() => import('./workspace-empty-state'), {
  loading: () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center animate-pulse">
      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
    </div>
  ),
  ssr: false
});

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

  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
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

  const workspaces = workspaceMembers.map((wm) => ({
    ...wm.workspace,
    userRole: wm.role,
    memberCount: wm.workspace._count.members,
    projectCount: wm.workspace._count.projects,
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
