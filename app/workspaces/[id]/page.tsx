import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { WorkspaceMembersList } from '@/components/WorkspaceMembersList';
import { Badge } from '@/components/ui/badge';
import { Users, FolderKanban, Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function WorkspacePage({ params }: { params: { id: string } }) {
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
        workspaceId: params.id,
        userId: user.id,
      },
    },
  });

  if (!member) {
    notFound();
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: params.id },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{workspace._count.members}</span>
              <span className="text-sm text-muted-foreground">/ {workspace.membersLimit}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{workspace._count.projects}</span>
              <span className="text-sm text-muted-foreground">/ {workspace.projectsLimit}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-sm capitalize">
                {workspace.subscriptionTier}
              </Badge>
              <span className="text-xs text-muted-foreground">{workspace.subscriptionStatus}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                Manage who has access to this workspace
              </p>
            </div>
            {canManageMembers && (
              <InviteMemberDialog workspaceId={workspace.id} workspaceName={workspace.name} />
            )}
          </div>
          <WorkspaceMembersList
            workspaceId={workspace.id}
            members={workspace.members.map(m => ({
              ...m,
              joinedAt: m.joinedAt.toISOString(),
              updatedAt: m.updatedAt.toISOString(),
            }))}
            currentUserRole={member.role}
            currentUserId={user.id}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Workspace Projects</h2>
            <p className="text-sm text-muted-foreground">
              Projects shared with this workspace
            </p>
          </div>
          {workspace.projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-center">
                  Add projects to share them with your team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {workspace.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Project {project.projectId}</CardTitle>
                        <CardDescription>
                          Permission: {project.permission}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {new Date(project.addedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <p className="text-sm text-muted-foreground">
              Invitations that haven't been accepted yet
            </p>
          </div>
          {workspace.invites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No pending invitations</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {workspace.invites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited as {invite.role} • Expires{' '}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
