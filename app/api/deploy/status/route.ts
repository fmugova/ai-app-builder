import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Utility for safe deploymentId
function isValidDeploymentId(id: string) {
  // UUID or Vercel-style short id
  return /^[a-zA-Z0-9\-_]{6,100}$/.test(id);
}

function handleError(error: unknown, context?: string) {
  let message = 'Unknown error';
  if (typeof error === 'object' && error !== null && 'message' in error) message = (error as Error).message;
  else if (typeof error === 'string') message = error;
  if (context) console.error(`[Deploy Status ERROR] ${context}:`, error);
  else console.error('[Deploy Status ERROR]:', error);
  return NextResponse.json({ error: 'A server error occurred. Please contact support.' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const deploymentId = request.nextUrl.searchParams.get('deploymentId');
    if (!deploymentId || !isValidDeploymentId(deploymentId)) {
      console.warn(`[Invalid deploymentId] User: ${session.user?.email} ID: ${deploymentId}`);
      return NextResponse.json({ error: 'Deployment ID required or invalid' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { VercelConnection: true },
    });
    if (!user?.VercelConnection) {
      return NextResponse.json({ error: 'Vercel not connected' }, { status: 400 });
    }
    // Check deployment status on Vercel
    let vercelRes: Response;
    try {
      vercelRes = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.VercelConnection.accessToken}`
          }
        }
      );
    } catch (err) {
      return handleError(err, 'Vercel status fetch');
    }
    if (!vercelRes.ok) {
      console.error(`[Vercel fetch failed] ${vercelRes.status} ${vercelRes.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch deployment status' },
        { status: 502 }
      );
    }
    const deployment = await vercelRes.json();
    // Defensive readyState check
    const readyState = deployment.readyState || (deployment.state && deployment.state.toUpperCase()) || 'UNKNOWN';
    // Update local database
    await prisma.deployment.updateMany({
      where: {
        deploymentId: deploymentId,
        userId: user.id
      },
      data: {
        status: readyState === 'READY' ? 'success' : 
                readyState === 'ERROR' ? 'error' : 'pending',
        deploymentUrl: deployment.url ? `https://${deployment.url}` : undefined
      }
    });
    return NextResponse.json({
      status: readyState === 'READY' ? 'ready' : 
              readyState === 'ERROR' ? 'error' : 'building',
      readyState,
      url: deployment.url ? `https://${deployment.url}` : null,
      error: deployment.error?.message || null
    });
  } catch (error: unknown) {
    return handleError(error, 'GET /api/deploy/status');
  }
}