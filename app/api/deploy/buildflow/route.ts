import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, slug } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate slug — always append a crypto-random suffix so it is globally unique
    // without needing a separate read-then-write (eliminates race condition).
    const uniqueSuffix = randomBytes(5).toString('hex') // 10 hex chars, ~1 trillion combinations
    let publishSlug = slug
      ? `${slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '').substring(0, 40)}-${uniqueSuffix}`
      : `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40)}-${uniqueSuffix}`

    // Update project atomically — DB unique constraint is the real guard.
    // Catch P2002 (unique violation) in the unlikely event of a collision and retry once.
    const doUpdate = (slug: string) => prisma.project.update({
      where: { id: projectId, userId: user.id },
      data: {
        publicSlug: slug,
        isPublished: true,
        publishedAt: new Date(),
        status: 'PUBLISHED',
      },
    })

    try {
      await doUpdate(publishSlug)
    } catch (e: unknown) {
      const isPrismaUniqueViolation =
        typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
      if (!isPrismaUniqueViolation) throw e
      // Retry with a fresh suffix on the rare collision
      publishSlug = `${publishSlug.substring(0, 40)}-${randomBytes(5).toString('hex')}`
      await doUpdate(publishSlug)
    }

    // Construct the published URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publishedUrl = `${baseUrl}/p/${publishSlug}`;

    console.log('✅ Project published to BuildFlow:', publishSlug);

    return NextResponse.json({
      success: true,
      url: publishedUrl,
      slug: publishSlug,
      message: 'Published successfully to BuildFlow!',
    });

  } catch (error) {
    console.error('BuildFlow publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish to BuildFlow' },
      { status: 500 }
    );
  }
}
