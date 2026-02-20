import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    // Verify state matches user email for security
    if (state !== session.user.email) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!githubClientId || !githubClientSecret) {
      return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/github/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      return NextResponse.json({ error: 'Token exchange failed', details: tokenData.error }, { status: 500 });
    }

    // Fetch user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    const userData = await userResponse.json();

    if (!userData.login) {
      return NextResponse.json({ error: 'Failed to fetch user info from GitHub' }, { status: 500 });
    }

    // Update user with GitHub credentials (encrypt token for security)
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubAccessToken: encrypt(tokenData.access_token),
        githubUsername: userData.login,
      },
    });

    // Redirect back to GitHub integration page with success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.json({ error: 'GitHub OAuth callback failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
