'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const WorkspaceMembersList = dynamic(
  () => import('@/components/WorkspaceMembersList').then(mod => ({ default: mod.WorkspaceMembersList })),
  {
    loading: () => (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    ),
    ssr: false
  }
);

const InviteMemberDialog = dynamic(
  () => import('@/components/InviteMemberDialog').then(mod => ({ default: mod.InviteMemberDialog })),
  {
    loading: () => null,
    ssr: false
  }
);

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MembersProps {
  workspaceId: string;
  workspaceName: string;
  members: Member[];
  currentUserRole: string;
  currentUserId: string;
  canManageMembers: boolean;
}

export default function Members({
  workspaceId,
  workspaceName,
  members,
  currentUserRole,
  currentUserId,
  canManageMembers,
}: MembersProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this workspace
          </p>
        </div>
        {canManageMembers && (
          <Suspense fallback={null}>
            <InviteMemberDialog workspaceId={workspaceId} workspaceName={workspaceName} />
          </Suspense>
        )}
      </div>
      <Suspense fallback={
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      }>
        <WorkspaceMembersList
          workspaceId={workspaceId}
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      </Suspense>
    </div>
  );
}
