import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        githubAccessToken: true,
        githubUsername: true,
      },
    });
    
    const connected = !!(user?.githubAccessToken && user?.githubUsername);
    
    return NextResponse.json({
      connected,
      username: user?.githubUsername || null,
    });
    
  } catch (error) {
    console.error('GitHub status check error:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
