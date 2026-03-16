// lib/autoDetectEndpoints.ts
// Scans ProjectFile records for a project and creates ApiEndpoint DB records.
// Detects three patterns:
//   1. Next.js App Router route files:  app/api/*/route.ts
//   2. Pages Router API routes:         pages/api/*.ts
//   3. Server Action files:             any file with 'use server' + exported async functions

import prisma from '@/lib/prisma';

type EndpointRow = {
  projectId: string; name: string; description: string;
  path: string; method: string; code: string;
  requiresAuth: boolean; usesDatabase: boolean;
  isActive: boolean; testsPassed: boolean;
};

export async function autoDetectAndSaveApiEndpoints(projectId: string): Promise<number> {
  const endpoints: EndpointRow[] = [];

  // ── 1. Route files (app/api/**/route.ts + pages/api/**) ─────────────────────
  const apiFiles = await prisma.projectFile.findMany({
    where: {
      projectId,
      OR: [
        { path: { contains: '/api/' } },
        { path: { startsWith: 'app/api/' } },
        { path: { startsWith: 'src/app/api/' } },
        { path: { startsWith: 'pages/api/' } },
        { path: { startsWith: 'src/pages/api/' } },
      ],
    },
  });

  for (const file of apiFiles) {
    if (!/route\.(ts|js)$/.test(file.path) && !/pages\/api\/.*\.(ts|js)$/.test(file.path)) continue;
    const routePath = '/' + file.path
      .replace(/^(?:src\/)?(?:app|pages)\//, '')
      .replace(/\/route\.(ts|js)$/, '')
      .replace(/\.(ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');
    const methodRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
    let methodMatch: RegExpExecArray | null;
    const methods: string[] = [];
    while ((methodMatch = methodRegex.exec(file.content)) !== null) methods.push(methodMatch[1]);
    if (methods.length === 0) methods.push('GET');
    const requiresAuth = /getServerSession|getToken|authorization/i.test(file.content);
    const usesDatabase = /prisma\.|supabase\.|from\s+['"]@prisma\/client['"]/.test(file.content);
    for (const method of methods) {
      endpoints.push({
        projectId, name: `[auto] ${method} ${routePath}`,
        description: `Auto-detected from ${file.path}`, path: routePath, method,
        code: file.content.slice(0, 2000), requiresAuth, usesDatabase,
        isActive: true, testsPassed: false,
      });
    }
  }

  // ── 2. Server Actions ('use server' files with exported async functions) ─────
  const serverActionFiles = await prisma.projectFile.findMany({
    where: {
      projectId,
      OR: [
        { path: { endsWith: '.ts' } },
        { path: { endsWith: '.tsx' } },
      ],
      // Only files that actually declare server actions
      content: { contains: "'use server'" },
    },
  });

  for (const file of serverActionFiles) {
    // Skip route files (already handled above)
    if (/\/api\//.test(file.path)) continue;

    // Extract exported async function names
    const fnRegex = /export\s+async\s+function\s+(\w+)/g;
    let fnMatch: RegExpExecArray | null;
    const actions: string[] = [];
    while ((fnMatch = fnRegex.exec(file.content)) !== null) {
      actions.push(fnMatch[1]);
    }
    if (actions.length === 0) continue;

    // Derive a logical path from the file location
    const actionPath = '/actions/' + file.path
      .replace(/^(?:src\/)?(?:app\/)?/, '')
      .replace(/\.(ts|tsx)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');

    const requiresAuth = /createClient|getServerSession|getToken|auth\.getUser/.test(file.content);
    const usesDatabase = /supabase\.|prisma\./.test(file.content);

    endpoints.push({
      projectId,
      name: `[auto] SERVER ACTION ${file.path.split('/').pop()?.replace(/\.(ts|tsx)$/, '') ?? 'actions'}`,
      description: `Server Actions: ${actions.slice(0, 5).join(', ')}${actions.length > 5 ? ` +${actions.length - 5} more` : ''}`,
      path: actionPath,
      method: 'SERVER_ACTION',
      code: file.content.slice(0, 2000),
      requiresAuth,
      usesDatabase,
      isActive: true,
      testsPassed: false,
    });
  }

  if (endpoints.length > 0) {
    await prisma.apiEndpoint.deleteMany({ where: { projectId, name: { startsWith: '[auto]' } } });
    await prisma.apiEndpoint.createMany({ data: endpoints, skipDuplicates: true });
  }

  return endpoints.length;
}

/**
 * Creates Page records for a Next.js project by scanning app router page.tsx files.
 * Skips API routes. Dynamic route segments are recorded with underscore prefix.
 */
export async function createNextjsPagesFromFiles(
  projectId: string,
  files: Record<string, string>
): Promise<void> {
  const pageEntries = Object.entries(files).filter(([path]) => {
    // Only app router page files (not API routes, not layout/loading/error)
    return (
      /^(?:src\/)?app\/(?!api\/).*\/page\.tsx?$/.test(path) ||
      /^(?:src\/)?app\/page\.tsx?$/.test(path)
    );
  });

  if (pageEntries.length === 0) return;

  // Delete existing auto-detected pages before re-creating
  await prisma.page.deleteMany({ where: { projectId } });

  const pageData: Array<{
    projectId: string; slug: string; title: string; content: string;
    description: string | null; metaTitle: string | null; metaDescription: string | null;
    isHomepage: boolean; order: number; isPublished: boolean;
  }> = [];

  pageEntries.forEach(([path, content], idx) => {
    // Derive slug from path: "app/about/page.tsx" → "about", "app/page.tsx" → "index"
    const slug = path
      .replace(/^(?:src\/)?app\//, '')
      .replace(/\/page\.tsx?$/, '')
      .replace(/page\.tsx?$/, 'index')  // root page.tsx
      .replace(/\[([^\]]+)\]/g, '_$1') // [id] → _id (skip dynamic but still record)
      || 'index';

    // Skip deeply nested dynamic routes (e.g., products/[id]/reviews)
    if ((slug.match(/\[/g) || []).length > 1) return;

    const isHomepage = slug === 'index' || slug === '';

    // Try to extract page title from metadata export or component content
    const metadataTitle = content.match(/metadata\s*=\s*\{[^}]*title:\s*['"`]([^'"`]+)['"`]/)?.[1];
    const h1Title = content.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1];
    const pageNameFromSlug = isHomepage
      ? 'Home'
      : slug.split('/').pop()!.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const title = metadataTitle || h1Title?.trim() || pageNameFromSlug;

    const metaDescription = content.match(/metadata\s*=\s*\{[^}]*description:\s*['"`]([^'"`]+)['"`]/)?.[1] ?? null;

    pageData.push({
      projectId,
      slug: isHomepage ? 'index' : slug,
      title,
      content,
      description: metaDescription,
      metaTitle: title,
      metaDescription,
      isHomepage,
      order: isHomepage ? 0 : idx + 1,
      isPublished: true,
    });
  });

  if (pageData.length > 0) {
    await prisma.page.createMany({ data: pageData, skipDuplicates: true });
  }
}
