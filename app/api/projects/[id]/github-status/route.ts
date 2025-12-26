import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if project has been exported to GitHub
    const deployment = await prisma.deployment.findFirst({
      where: {
        projectId: params.id,
        platform: 'github',
        status: 'success'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      hasGithubRepo: !!deployment,
      repoName: deployment?.vercelProjectId || null,
      exportedAt: deployment?.createdAt || null
    });

  } catch (error: any) {
    console.error('GitHub status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check GitHub status' },
      { status: 500 }
    );
  }
}
