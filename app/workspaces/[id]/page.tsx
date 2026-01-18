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

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
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
      projects: {
        orderBy: {
          addedAt: 'desc',
        },
      },
      invites: {
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
          members: true,
          projects: true,
        },
      },
    },
  });

  if (!workspace) {
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
              <h1 className="text-3xl font-bold">{workspace.name}</h1>
              <Badge variant="outline">{member.role}</Badge>
            </div>
            <p className="text-muted-foreground">
              {workspace.description || 'No description'}
            </p>
          </div>
          <Link href={`/workspaces/${workspace.id}/settings`}>
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
          <Overview workspace={workspace} />
        </TabsContent>

        <TabsContent value="members">
          <Members
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            members={workspace.members.map(m => ({
              ...m,
              joinedAt: m.joinedAt.toISOString(),
              updatedAt: m.updatedAt.toISOString(),
            }))}
            currentUserRole={member.role}
            currentUserId={user.id}
            canManageMembers={canManageMembers}
          />
        </TabsContent>

        <TabsContent value="projects">
          <Projects projects={workspace.projects} />
        </TabsContent>

        <TabsContent value="invites">
          <Invites invites={workspace.invites} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
