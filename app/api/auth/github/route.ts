import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

function getBaseUrl(request: Request): string {
  // In production, use NEXTAUTH_URL or the request origin
  const headersList = headers();
  const host = headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  
  // Prefer NEXTAUTH_URL for production
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Fall back to NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // For local development or fallback, construct from host
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Ultimate fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || 'dashboard';
  
  const baseUrl = getBaseUrl(request);
  
  // Don't check session here - just redirect to GitHub
  // We'll check authentication on the callback
  const state = Buffer.from(JSON.stringify({ 
    projectId,
    timestamp: Date.now()
  })).toString('base64');
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.append('client_id', process.env.GITHUB_CLIENT_ID!);
  githubAuthUrl.searchParams.append('redirect_uri', `${baseUrl}/api/auth/github/callback`);
  githubAuthUrl.searchParams.append('scope', 'repo,user:email');
  githubAuthUrl.searchParams.append('state', state);
  
  console.log('🔗 Base URL:', baseUrl);
  console.log('🔗 Redirecting to GitHub OAuth:', githubAuthUrl.toString());
  
  return NextResponse.redirect(githubAuthUrl.toString());
}
