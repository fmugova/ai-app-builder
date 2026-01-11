'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FolderKanban, Settings } from 'lucide-react';
import Link from 'next/link';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  userRole: string;
  memberCount: number;
  projectCount: number;
  subscriptionTier: string;
}

interface WorkspaceGridProps {
  workspaces: Workspace[];
}

export default function WorkspaceGrid({ workspaces }: WorkspaceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workspaces.map((workspace) => (
        <Link key={workspace.id} href={`/workspaces/${workspace.id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{workspace.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {workspace.description || 'No description'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {workspace.userRole}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{workspace.memberCount} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <FolderKanban className="h-4 w-4" />
                  <span>{workspace.projectCount} projects</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {workspace.subscriptionTier} plan
                  </span>
                  <Link
                    href={`/workspaces/${workspace.id}/settings`}
                    className="text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings className="h-3 w-3" />
                    Settings
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
