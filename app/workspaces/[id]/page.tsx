import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

// Lazy load each tab component - only loads when user clicks the tab!
const Overview = dynamic(() => import('./overview'), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  ),
});

const Members = dynamic(() => import('./members'), {
  loading: () => (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  ),
});

const Projects = dynamic(() => import('./projects'), {
  loading: () => (
    <div className="space-y-3 animate-pulse">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    </div>
  ),
});

const Invites = dynamic(() => import('./invites'), {
  loading: () => (
    <div className="space-y-3 animate-pulse">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
    </div>
  ),
});

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: id,
        userId: user.id,
      },
    },
  });

  if (!member) {
    notFound();
  }

  const Workspace = await prisma.workspace.findUnique({
    where: { id },
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
        orderBy: {
          joinedAt: 'asc',
        },
      },
      WorkspaceProject: {
        orderBy: {
          addedAt: 'desc',
        },
      },
      WorkspaceInvite: {
        where: {
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          WorkspaceMember: true,
          WorkspaceProject: true,
        },
      },
    },
  });

  if (!Workspace) {
    notFound();
  }

  const canManageMembers = member.role === 'owner' || member.role === 'admin';

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/workspaces">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workspaces
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{Workspace.name}</h1>
              <Badge variant="outline">{member.role}</Badge>
            </div>
            <p className="text-muted-foreground">
              {Workspace.description || 'No description'}
            </p>
          </div>
          <Link href={`/workspaces/${Workspace.id}/settings`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview workspace={{ 
            ...Workspace, 
            _count: { 
              members: Workspace.WorkspaceMember?.length ?? 0,
              projects: Workspace.WorkspaceProject?.length ?? 0 
            }, 
            membersLimit: Workspace.membersLimit, 
            projectsLimit: Workspace.projectsLimit, 
            subscriptionTier: Workspace.subscriptionTier, 
            subscriptionStatus: Workspace.subscriptionStatus 
          }} 
          />
        </TabsContent>

        <TabsContent value="members">
          <Members
            workspaceId={Workspace.id}
            workspaceName={Workspace.name}
            members={Array.isArray(Workspace.WorkspaceMember) ? Workspace.WorkspaceMember.map((m) => ({
              ...m,
              joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
              updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
              user: m.User
            })) : []}
            currentUserRole={member.role}
            currentUserId={user.id}
            canManageMembers={canManageMembers}
          />
        </TabsContent>

        <TabsContent value="projects">
          <Projects projects={Workspace.WorkspaceProject} />
        </TabsContent>

        <TabsContent value="invites">
          <Invites invites={Workspace.WorkspaceInvite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
