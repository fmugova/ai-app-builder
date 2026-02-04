import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Remove GitHub credentials
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubAccessToken: null,
        githubUsername: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'GitHub account disconnected successfully',
    });
  } catch (error) {
    console.error('GitHub disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub account' },
      { status: 500 }
    );
  }
}
