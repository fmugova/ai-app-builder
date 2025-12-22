import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Production: https://www.buildflow-ai.app
// Development: https://ai-app-builder-flame.vercel.app
const PRODUCTION_URL = 'https://www.buildflow-ai.app';
const DEVELOPMENT_URL = 'https://ai-app-builder-flame.vercel.app';

function getBaseUrl(): string {
  const headersList = headers();
  const host = headersList.get('host') || '';
  
  // Check if we're on production domain
  if (host.includes('buildflow-ai.app')) {
    return PRODUCTION_URL;
  }
  
  // Check if we're on Vercel preview/development
  if (host.includes('vercel.app')) {
    return DEVELOPMENT_URL;
  }
  
  // Local development
  if (host.includes('localhost')) {
    return 'http://localhost:3000';
  }
  
  // Fallback to production
  return PRODUCTION_URL;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  console.log('📥 GitHub callback received:', { code: !!code, state, error });
  
  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    const baseUrl = getBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=github_auth_denied`
    );
  }
  
  if (!code) {
    const baseUrl = getBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=github_no_code`
    );
  }
  
  try {
    const baseUrl = getBaseUrl();
    
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
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
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
