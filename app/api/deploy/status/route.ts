import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deploymentId = searchParams.get('deploymentId');
  
  if (!deploymentId) {
    return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 });
  }
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        vercelConnection: true,
      },
    });
    
    if (!user?.vercelConnection?.accessToken) {
      return NextResponse.json({ error: 'Vercel not connected' }, { status: 400 });
    }
    
    // Get deployment from database
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });
    
    if (!deployment || deployment.userId !== user.id) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }
    
    // Check Vercel deployment status
    const vercelResponse = await fetch(
      `https://api.vercel.com/v13/deployments/${deployment.deploymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${user.vercelConnection.accessToken}`,
        },
      }
    );
    
    if (!vercelResponse.ok) {
      throw new Error('Failed to fetch deployment status from Vercel');
    }
    
    const vercelData = await vercelResponse.json();
    
    // Map Vercel states to our states
    const statusMap: Record<string, string> = {
      'READY': 'ready',
      'ERROR': 'error',
      'BUILDING': 'building',
      'QUEUED': 'building',
      'INITIALIZING': 'building',
      'CANCELED': 'error',
    };
    
    const newStatus = statusMap[vercelData.readyState] || 'building';
    
    // Update deployment in database
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: newStatus,
        errorMessage: vercelData.readyState === 'ERROR' ? vercelData.error?.message : null,
        deploymentUrl: vercelData.url ? `https://${vercelData.url}` : deployment.deploymentUrl,
      },
    });
    
    return NextResponse.json({
      status: newStatus,
      url: vercelData.url ? `https://${vercelData.url}` : deployment.deploymentUrl,
      error: vercelData.error?.message,
      readyState: vercelData.readyState,
    });
    
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to check status' 
    }, { status: 500 });
  }
}
