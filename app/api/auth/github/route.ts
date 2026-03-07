// app/api/auth/github/route.ts
// ✅ FIXED: Next.js 15 signature + removed extra brace + NextRequest type

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getGithubOAuthCredentials } from '@/lib/github-oauth';

const { clientId: githubClientId } = getGithubOAuthCredentials();

// Production: https://buildflow-ai.app (no www)
// Development: use current vercel host
const PRODUCTION_URL = 'https://buildflow-ai.app';
const DEFAULT_DEV_SUBDOMAIN = 'ai-app-builder-flame.vercel.app';

async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const xForwardedHost = headersList.get('x-forwarded-host') || '';
  const xForwardedProto = headersList.get('x-forwarded-proto') || 'https';
  
  // Check both host and x-forwarded-host for production domain
  const effectiveHost = xForwardedHost || host;
  
  if (effectiveHost.replace(/^www\./, '').includes('buildflow-ai.app')) {
    return PRODUCTION_URL;
  }
  
  // Check if we're on Vercel preview/development
  if (effectiveHost.includes('vercel.app')) {
    return `${xForwardedProto}://${effectiveHost || DEFAULT_DEV_SUBDOMAIN}`;
  }
  
  // Local development
  if (effectiveHost.includes('localhost')) {
    return 'http://localhost:3000';
  }
  
  // Fallback to production
  return PRODUCTION_URL;
}

// ✅ FIX 1: Changed Request to NextRequest
// ✅ FIX 2: Added context parameter for Next.js 15
export async function GET(
  request: NextRequest,
  context: { params: Promise<object> }
) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || 'dashboard';
  
  const baseUrl = await getBaseUrl();
  
  // Don't check session here - just redirect to GitHub
  // We'll check authentication on the callback
  const state = Buffer.from(JSON.stringify({ 
    projectId,
    timestamp: Date.now()
  })).toString('base64');
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.append('client_id', githubClientId);
  githubAuthUrl.searchParams.append('redirect_uri', `${baseUrl}/api/auth/github/callback`);
  githubAuthUrl.searchParams.append('scope', 'repo,user:email');
  githubAuthUrl.searchParams.append('state', state);
  
  return NextResponse.redirect(githubAuthUrl.toString());
}
// ✅ FIX 3: Removed extra closing brace that was here!
