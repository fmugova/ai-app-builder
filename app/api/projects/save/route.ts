import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parseMultiPageHTML, validatePages } from '@/lib/multi-page-parser';

// Validation schema
const projectSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  code: z.string().max(500000, 'Code exceeds 500KB limit'),
  validation: z.object({
    passed: z.boolean().optional(),
    score: z.number().optional(),
    errors: z.array(z.union([
      z.string(),
      z.object({ message: z.string() })
    ])).optional(),
    warnings: z.array(z.union([
      z.string(),
      z.object({ message: z.string() })
    ])).optional()
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

    // Parse multi-page HTML if present
    console.log('🔍 Checking for multi-page format in code...');
    console.log('Code preview (first 500 chars):', code.substring(0, 500));
    const multiPageResult = parseMultiPageHTML(code);
    console.log('📄 Multi-page parse result:', {
      isMultiPage: multiPageResult.isMultiPage,
      pageCount: multiPageResult.pages.length,
      pageSlugs: multiPageResult.pages.map(p => p.slug)
    });

    if (id) {
      // Update existing project
      const project = await prisma.project.update({
        where: { id, userId: session.user.id },
        data: {
          name,
          code,
          validationPassed: validation?.passed ?? undefined,
          validationScore: validation?.score != null ? BigInt(Math.round(validation.score)) : undefined,
          validationErrors: validation?.errors ?? undefined,
          validationWarnings: validation?.warnings ?? undefined,
        },
      });

      // If multi-page, create/update pages in database
      if (multiPageResult.isMultiPage && multiPageResult.pages.length > 0) {
        const pageValidation = validatePages(multiPageResult.pages);
        
        if (!pageValidation.valid) {
          console.warn('Page validation warnings:', pageValidation.errors);
          // Continue anyway - pages might be valid enough
        }

        // Delete existing pages for this project
        await prisma.page.deleteMany({
          where: { projectId: project.id }
        });

        // Create new pages
        await prisma.page.createMany({
          data: multiPageResult.pages.map(page => ({
            projectId: project.id,
            slug: page.slug,
            title: page.title,
            content: page.content,
            description: page.description || null,
            metaTitle: page.metaTitle || null,
            metaDescription: page.metaDescription || null,
            isHomepage: page.isHomepage,
            order: page.order,
            isPublished: true,
          }))
        });

        // Log multi-page creation
        await prisma.activity.create({
          data: {
            userId: session.user.id,
            type: 'project',
            action: 'multi_page_detected',
            metadata: {
              projectId: project.id,
              pageCount: multiPageResult.pages.length,
              pageSlugs: multiPageResult.pages.map(p => p.slug),
            },
          },
        });
      }

      return NextResponse.json({ 
        id: project.id, 
        success: true,
        multiPage: multiPageResult.isMultiPage,
        pageCount: multiPageResult.pages.length 
      });
    } else {
      // Create new project
      const project = await prisma.project.create({
        data: {
          name,
          code,
          type: 'web', // Common types: 'web', 'api', 'mobile' - adjust based on your needs
          validationPassed: validation?.passed ?? undefined,
          validationScore: validation?.score != null ? BigInt(Math.round(validation.score)) : undefined,
          validationErrors: validation?.errors ?? undefined,
          validationWarnings: validation?.warnings ?? undefined,
          userId: session.user.id,
        },
      });

      // If multi-page, create pages in database
      if (multiPageResult.isMultiPage && multiPageResult.pages.length > 0) {
        const pageValidation = validatePages(multiPageResult.pages);
        
        if (!pageValidation.valid) {
          console.warn('Page validation warnings:', pageValidation.errors);
        }

        await prisma.page.createMany({
          data: multiPageResult.pages.map(page => ({
            projectId: project.id,
            slug: page.slug,
            title: page.title,
            content: page.content,
            description: page.description || null,
            metaTitle: page.metaTitle || null,
            metaDescription: page.metaDescription || null,
            isHomepage: page.isHomepage,
            order: page.order,
            isPublished: true,
          }))
        });

        // Log multi-page creation
        await prisma.activity.create({
          data: {
            userId: session.user.id,
            type: 'project',
            action: 'multi_page_created',
            metadata: {
              projectId: project.id,
              pageCount: multiPageResult.pages.length,
              pageSlugs: multiPageResult.pages.map(p => p.slug),
            },
          },
        });
      }

      return NextResponse.json({ 
        id: project.id, 
        success: true,
        multiPage: multiPageResult.isMultiPage,
        pageCount: multiPageResult.pages.length 
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      console.error('❌ Zod Validation Error:', {
        issues: zodError.issues,
        details: zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      });
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`)
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
