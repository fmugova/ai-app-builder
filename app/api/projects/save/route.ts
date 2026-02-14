import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parseMultiPageHTML, validatePages } from '@/lib/multi-page-parser';
import { applyBuildFlowInjections, extractSinglePageSEO } from '@/lib/code-injector';

const projectSaveSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  code: z.string().max(500000, 'Code exceeds 500KB limit'),
  validation: z.object({
    passed: z.boolean().optional(),
    score: z.number().optional(),
    errors: z.array(z.union([z.string(), z.object({ message: z.string() })])).optional(),
    warnings: z.array(z.union([z.string(), z.object({ message: z.string() })])).optional()
  }).optional().nullable(),
  projectType: z.string().optional().nullable(),
  isMultiFile: z.boolean().optional().nullable(),
  filesCount: z.number().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    console.log('Save request body:', JSON.stringify(body, null, 2));
    let validatedData;
    try {
      validatedData = projectSaveSchema.parse(body);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
      }
      throw zodError;
    }
    const { id, name, code, validation } = validatedData;
    const multiPageResult = parseMultiPageHTML(code);
    async function savePages(projectId: string) {
      await prisma.page.deleteMany({ where: { projectId } });
      if (multiPageResult.isMultiPage && multiPageResult.pages.length > 0) {
        const pageValidation = validatePages(multiPageResult.pages);
        if (!pageValidation.valid) { console.warn('Page validation warnings:', pageValidation.errors); }
        await prisma.page.createMany({
          data: multiPageResult.pages.map(page => ({
            projectId, slug: page.slug, title: page.title, content: page.content,
            description: page.description || null, metaTitle: page.metaTitle || null,
            metaDescription: page.metaDescription || null, isHomepage: page.isHomepage,
            order: page.order, isPublished: true,
          })),
        });
      } else {
        const seo = extractSinglePageSEO(code);
        await prisma.page.create({
          data: {
            projectId, slug: 'home', title: seo.title, content: code,
            description: seo.description || null, metaTitle: seo.metaTitle || null,
            metaDescription: seo.metaDescription || null, isHomepage: true,
            order: 0, isPublished: true,
          },
        });
      }
    }
    async function autoDetectAndSaveApiEndpoints(projectId: string) {
      const routePattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g
      const pathPattern = /\/\/\s*(?:Route|Path|Endpoint):\s*(\/[\w\/\[\]-]+)/gi
      const pathFromCode = /['"`](\/api\/[\w\/\[\]-]+)['"`]/g
      const methods: string[] = []
      let m: RegExpExecArray | null
      while ((m = routePattern.exec(code)) !== null) { methods.push(m[1]) }
      if (methods.length === 0) return
      const paths: string[] = []
      while ((m = pathPattern.exec(code)) !== null) paths.push(m[1])
      while ((m = pathFromCode.exec(code)) !== null) { if (!paths.includes(m[1])) paths.push(m[1]) }
      await prisma.apiEndpoint.deleteMany({ where: { projectId, name: { startsWith: '[auto]' } } })
      const toCreate = methods.flatMap((method, i) => {
        const path = paths[i] ?? `/api/endpoint-${i + 1}`
        return [{ projectId, name: `[auto] ${method} ${path}`, description: `Auto-detected from generated project code`, path, method,
          code: `// Auto-detected — see generated project code`,
          requiresAuth: code.toLowerCase().includes('getserversession') || code.toLowerCase().includes('authorization'),
          usesDatabase: code.includes('prisma.') || code.includes("from '@prisma/client'"),
          isActive: true, testsPassed: false }]
      })
      if (toCreate.length > 0) { await prisma.apiEndpoint.createMany({ data: toCreate, skipDuplicates: true }) }
    }
    if (id) {
      const processedCode = applyBuildFlowInjections(code, id);
      const project = await prisma.project.update({
        where: { id, userId: session.user.id },
        data: { name, code: processedCode,
          validationPassed: validation?.passed ?? undefined,
          validationScore: validation?.score != null ? BigInt(Math.round(validation.score)) : undefined,
          validationErrors: validation?.errors ?? undefined,
          validationWarnings: validation?.warnings ?? undefined,
        },
      });
      await savePages(project.id);
      await autoDetectAndSaveApiEndpoints(project.id)
      return NextResponse.json({
        id: project.id, success: true,
        multiPage: multiPageResult.isMultiPage,
        pageCount: multiPageResult.isMultiPage ? multiPageResult.pages.length : 1,
      });
    } else {
      const project = await prisma.project.create({
        data: { name, code, type: 'web',
          validationPassed: validation?.passed ?? undefined,
          validationScore: validation?.score != null ? BigInt(Math.round(validation.score)) : undefined,
          validationErrors: validation?.errors ?? undefined,
          validationWarnings: validation?.warnings ?? undefined,
          userId: session.user.id,
        },
      });
      const processedCode = applyBuildFlowInjections(code, project.id);
      await prisma.project.update({ where: { id: project.id }, data: { code: processedCode } });
      await savePages(project.id);
      await autoDetectAndSaveApiEndpoints(project.id)
      return NextResponse.json({
        id: project.id, success: true,
        multiPage: multiPageResult.isMultiPage,
        pageCount: multiPageResult.isMultiPage ? multiPageResult.pages.length : 1,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json({ error: 'Validation failed', details: zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`) }, { status: 400 });
    }
    console.error('Save project error:', error);
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}
