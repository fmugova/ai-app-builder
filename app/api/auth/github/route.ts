import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || 'dashboard';
  
  // Don't check session here - just redirect to GitHub
  // We'll check authentication on the callback
  const state = Buffer.from(JSON.stringify({ 
    projectId,
    timestamp: Date.now()
  })).toString('base64');
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.append('client_id', process.env.GITHUB_CLIENT_ID!);
  githubAuthUrl.searchParams.append('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`);
  githubAuthUrl.searchParams.append('scope', 'repo,user:email');
  githubAuthUrl.searchParams.append('state', state);
  
  console.log('🔗 Redirecting to GitHub OAuth:', githubAuthUrl.toString());
  
  return NextResponse.redirect(githubAuthUrl.toString());
}
