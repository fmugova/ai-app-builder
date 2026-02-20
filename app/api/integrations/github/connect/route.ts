import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    
    if (!githubClientId) {
      return NextResponse.json(
        { error: 'GitHub OAuth not configured' },
        { status: 500 }
      );
    }

    // Build the OAuth URL
    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/github/callback`,
      scope: 'repo,user:email',
      state: session.user.email, // Use email as state for verification
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.json({ success: true, url: githubAuthUrl });
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub OAuth', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
