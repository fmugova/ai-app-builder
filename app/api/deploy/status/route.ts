import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deploymentId = request.nextUrl.searchParams.get('deploymentId');
    
    if (!deploymentId) {
      return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { VercelConnection: true }
    });

    if (!user?.VercelConnection) {
      return NextResponse.json({ error: 'Vercel not connected' }, { status: 400 });
    }

    // Check deployment status on Vercel
    const vercelRes = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${user.VercelConnection.accessToken}`
        }
      }
    );

    if (!vercelRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch deployment status' },
        { status: 500 }
      );
    }

    const deployment = await vercelRes.json();

    // Update local database
    await prisma.deployment.updateMany({
      where: {
        deploymentId: deploymentId,
        userId: user.id
      },
      data: {
        status: deployment.readyState === 'READY' ? 'success' : 
                deployment.readyState === 'ERROR' ? 'error' : 'pending',
        deploymentUrl: deployment.url ? `https://${deployment.url}` : undefined
      }
    });

    return NextResponse.json({
      status: deployment.readyState === 'READY' ? 'ready' : 
              deployment.readyState === 'ERROR' ? 'error' : 'building',
      readyState: deployment.readyState,
      url: deployment.url ? `https://${deployment.url}` : null,
      error: deployment.error?.message || null
    });

  } catch (error: unknown) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
