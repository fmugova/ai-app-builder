import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// import { Octokit } from '@octokit/rest'; // TODO: Implement GitHub deployment

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // TODO: Implement GitHub deployment
    // This requires:
    // 1. GitHub OAuth token
    // 2. Create repository
    // 3. Push code
    // 4. Set up GitHub Pages

    // For now, return a message indicating feature is coming soon
    return NextResponse.json({
      url: '#',
      success: false,
      message: 'GitHub deployment coming soon! Please use BuildFlow Publish for now.',
    }, { status: 501 });
  } catch (error) {
    console.error('GitHub deploy error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy to GitHub' },
      { status: 500 }
    );
  }
}
