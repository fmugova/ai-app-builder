import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, code, validation } = await req.json();

    if (id) {
      // Update existing project
      const project = await prisma.project.update({
        where: { id, userId: session.user.id },
        data: {
          name,
          code,
          validationPassed: validation?.passed ?? null,
          validationScore: validation?.score != null ? BigInt(Math.round(validation.score)) : null,
          validationErrors: validation?.errors ?? null,
          validationWarnings: validation?.warnings ?? null,
        },
      });

      return NextResponse.json({ id: project.id, success: true });
    } else {
      // Create new project
      const project = await prisma.project.create({
        data: {
          name,
          code,
          type: 'web', // Common types: 'web', 'api', 'mobile' - adjust based on your needs
          validationPassed: validation?.passed ?? null,
          validationScore: validation?.score != null ? BigInt(Math.round(validation.score)) : null,
          validationErrors: validation?.errors ?? null,
          validationWarnings: validation?.warnings ?? null,
          userId: session.user.id,
        },
      });

      return NextResponse.json({ id: project.id, success: true });
    }
  } catch (error) {
    console.error('Save project error:', error);
    return NextResponse.json(
      { error: 'Failed to save project' },
      { status: 500 }
    );
  }
}
