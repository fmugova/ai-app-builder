import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { getGithubOAuthCredentials } from '@/lib/github-oauth';
import { getPostHogClient } from '@/lib/posthog-server';

const { clientId: githubClientId, clientSecret: githubClientSecret } = getGithubOAuthCredentials();

// Production: https://buildflow-ai.app (no www)
// Development: use current vercel host
const PRODUCTION_URL = 'https://buildflow-ai.app';

async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const xForwardedHost = headersList.get('x-forwarded-host') || '';
  const xForwardedProto = headersList.get('x-forwarded-proto') || 'https';
  
  // Log for debugging
  console.log('🔍 GitHub Callback - Host header:', host);
  console.log('🔍 GitHub Callback - X-Forwarded-Host:', xForwardedHost);
  
  // Check both host and x-forwarded-host for production domain
  const effectiveHost = xForwardedHost || host;
  
  if (effectiveHost.replace(/^www\./, '').includes('buildflow-ai.app')) {
    console.log('✅ Detected PRODUCTION environment');
    return PRODUCTION_URL;
  }
  
  // Check if we're on Vercel preview/development
  if (effectiveHost.includes('vercel.app')) {
    console.log('✅ Detected DEVELOPMENT environment');
    return `${xForwardedProto}://${effectiveHost}`;
  }
  
  // Local development
  if (effectiveHost.includes('localhost')) {
    console.log('✅ Detected LOCAL environment');
    return 'http://localhost:3000';
  }
  
  // Fallback to production
  console.log('⚠️ No match found, defaulting to PRODUCTION');
  return PRODUCTION_URL;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  console.log('📥 GitHub callback received:', { code: !!code, state, error });
  
  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    const baseUrl = await getBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=github_auth_denied`
    );
  }
  
  if (!code) {
    const baseUrl = await getBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=github_no_code`
    );
  }
  
  try {
    const baseUrl = await getBaseUrl();
    
    // Exchange code for access token
    console.log('🔄 Exchanging code for token...');
    console.log('🔗 Base URL:', baseUrl);
    
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
        redirect_uri: `${baseUrl}/api/auth/github/callback`,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('❌ No access token received:', tokenData);
      throw new Error(tokenData.error_description || 'Failed to get access token');
    }
    
    console.log('✅ Access token received');
    
    // Get GitHub user info
    console.log('👤 Fetching GitHub user info...');
    
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    const githubUser = await userResponse.json();
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user info');
    }
    
    console.log('✅ GitHub user:', githubUser.login);
    
    // NOW check session (user must be logged into BuildFlow)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No BuildFlow session found, redirecting to login');
      
      // Store GitHub credentials temporarily in a way we can retrieve after login
      // For now, just redirect to login with a message
      return NextResponse.redirect(
        `${baseUrl}/auth/signin?error=login_required&message=Please login to connect GitHub`
      );
    }
    
    console.log('✅ BuildFlow session found:', session.user.email);
    
    // Save GitHub credentials to user
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubAccessToken: tokenData.access_token,
        githubUsername: githubUser.login,
      },
    });
    
    console.log('✅ GitHub connected for user:', session.user.email);

    // PostHog server-side: track GitHub connection
    try {
      const distinctId = (session.user as { id?: string }).id || session.user.email!;
      const ph = getPostHogClient();
      ph.capture({
        distinctId,
        event: 'github_connected',
        properties: { github_username: githubUser.login },
      });
    } catch {
      // Non-fatal
    }

    // Decode state to get projectId
    let redirectPath = '/dashboard?github_connected=true';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        if (decoded.projectId && decoded.projectId !== 'dashboard') {
          redirectPath = `/builder?project=${decoded.projectId}&github_connected=true`;
        }
      } catch (e) {
        console.error('Failed to decode state:', e);
      }
    }
    
    console.log('🎉 Redirecting to:', redirectPath);
    
    return NextResponse.redirect(
      `${baseUrl}${redirectPath}`
    );
    
  } catch (error: any) {
    console.error('❌ GitHub OAuth callback error:', error);
    const baseUrl = getBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=github_connection_failed&details=${encodeURIComponent(error.message)}`
    );
  }
}
