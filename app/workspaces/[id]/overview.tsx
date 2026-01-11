'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FolderKanban } from 'lucide-react';

interface OverviewProps {
  workspace: {
    _count: {
      members: number;
      projects: number;
    };
    membersLimit: number;
    projectsLimit: number;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}

export default function Overview({ workspace }: OverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
  );
}
