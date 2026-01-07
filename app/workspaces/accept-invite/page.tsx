'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface InviteData {
  email: string;
  role: string;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
  };
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setIsLoading(false);
      return;
    }

    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      const response = await fetch(`/api/workspaces/invites/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invitation');
      }

      setInvite(data.invite);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    try {
      const response = await fetch(`/api/workspaces/invites/${token}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setAccepted(true);
      toast({
        title: 'Invitation accepted',
        description: `You've joined ${data.workspace.name}!`,
      });

      setTimeout(() => {
        router.push(`/workspaces/${data.workspace.id}`);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept invitation',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need to be signed in to accept this invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/auth/signin?callbackUrl=/workspaces/accept-invite?token=${token}`)}
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <XCircle className="h-6 w-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/workspaces')} variant="outline" className="w-full">
              Go to Workspaces
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>Invitation Accepted!</CardTitle>
            </div>
            <CardDescription>
              Redirecting you to the workspace...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  const emailMismatch = session.user?.email !== invite.email;

  return (
    <div className="container mx-auto py-16 px-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">{invite.workspace.name}</h3>
              <p className="text-sm text-muted-foreground">
                {invite.workspace.description || 'No description'}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium capitalize">{invite.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invited email:</span>
                <span className="font-medium">{invite.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires:</span>
                <span className="font-medium">
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {emailMismatch && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This invitation was sent to <strong>{invite.email}</strong>, but you're signed in as{' '}
                <strong>{session.user?.email}</strong>. Please sign in with the correct account.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/workspaces')}
              variant="outline"
              className="flex-1"
              disabled={isAccepting}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1"
              disabled={isAccepting || emailMismatch}
            >
              {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Invitation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
