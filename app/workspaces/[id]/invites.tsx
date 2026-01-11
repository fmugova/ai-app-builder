'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
}

interface InvitesProps {
  invites: Invite[];
}

export default function Invites({ invites }: InvitesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Pending Invitations</h2>
        <p className="text-sm text-muted-foreground">
          Invitations that haven&apos;t been accepted yet
        </p>
      </div>
      {invites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No pending invitations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
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
    </div>
  );
}
