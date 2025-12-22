import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Production: https://www.buildflow-ai.app
// Development: https://ai-app-builder-flame.vercel.app
const PRODUCTION_URL = 'https://www.buildflow-ai.app';
const DEVELOPMENT_URL = 'https://ai-app-builder-flame.vercel.app';

function getBaseUrl(): string {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const xForwardedHost = headersList.get('x-forwarded-host') || '';
  
  // Log for debugging
  console.log('🔍 GitHub OAuth - Host header:', host);
  console.log('🔍 GitHub OAuth - X-Forwarded-Host:', xForwardedHost);
  
  // Check both host and x-forwarded-host for production domain
  const effectiveHost = xForwardedHost || host;
  
  if (effectiveHost.includes('buildflow-ai.app') || effectiveHost.includes('buildflow-ai')) {
    console.log('✅ Detected PRODUCTION environment');
    return PRODUCTION_URL;
  }
  
  // Check if we're on Vercel preview/development
  if (effectiveHost.includes('vercel.app') || effectiveHost.includes('flame')) {
    console.log('✅ Detected DEVELOPMENT environment');
    return DEVELOPMENT_URL;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || 'dashboard';
  
  const baseUrl = getBaseUrl();
  
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
