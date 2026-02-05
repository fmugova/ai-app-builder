import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const projectSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  code: z.string().max(500000, 'Code exceeds 500KB limit'),
  validation: z.object({
    passed: z.boolean().optional(),
    score: z.number().optional(),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional()
  }).optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const { id, name, code, validation } = projectSaveSchema.parse(body);

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }
    console.error('Save project error:', error);
    return NextResponse.json(
      { error: 'Failed to save project' },
      { status: 500 }
    );
  }
}
