'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import dynamic from 'next/dynamic';

const CreateWorkspaceDialog = dynamic(
  () => import('@/components/CreateWorkspaceDialog').then(mod => ({ default: mod.CreateWorkspaceDialog })),
  {
    loading: () => null,
    ssr: false
  }
);

export default function WorkspaceEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No workspaces yet</h3>
        <p className="text-muted-foreground text-center mb-6">
          Create a workspace to start collaborating with your team.
        </p>
        <CreateWorkspaceDialog />
      </CardContent>
    </Card>
  );
}
