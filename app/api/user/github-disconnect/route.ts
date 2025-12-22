import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Remove GitHub credentials from user
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubAccessToken: null,
        githubUsername: null,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'GitHub disconnected successfully',
    });
    
  } catch (error: any) {
    console.error('GitHub disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect GitHub' },
      { status: 500 }
    );
  }
}
