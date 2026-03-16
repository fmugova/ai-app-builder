// lib/pipeline/nextjsGenerationPipeline.ts
// Next.js + Supabase generation pipeline.
// Generates feature-specific files on top of the pre-built scaffold.
// Output is streamed via onFile as each === FILE: path === block is parsed.

import Anthropic from '@anthropic-ai/sdk';
import { NEXTJS_SYSTEM_PROMPT, parseNextjsOutput } from '@/lib/generation/nextjsPrompt';
import { getScaffoldFiles } from '@/lib/scaffold/nextjs-scaffold';
import { getDashboardScaffoldFiles, DASHBOARD_SYSTEM_PROMPT_ADDON } from '@/lib/scaffold/dashboard-scaffold';
import { getSaasMultitenantScaffoldFiles, SAAS_MULTITENANT_SYSTEM_PROMPT_ADDON } from '@/lib/scaffold/saas-multitenant-scaffold';
import { getEcommerceScaffoldFiles, ECOMMERCE_NEXTJS_SYSTEM_PROMPT_ADDON } from '@/lib/scaffold/ecommerce-scaffold';
import { getBlogScaffoldFiles, BLOG_NEXTJS_SYSTEM_PROMPT_ADDON } from '@/lib/scaffold/blog-scaffold';
import type { ProgressCallback, FileCallback, PipelineResult } from './htmlGenerationPipeline';

const anthropic = new Anthropic();

// ── Missing-import stub generator ─────────────────────────────────────────────
// Scans all @/ imports across generated files and creates minimal stubs for
// any that don't resolve to an existing file. This prevents "Module not found"
// build errors when Claude forgets to output a component it referenced.

const IMPORT_RE = /import\s+(?:type\s+)?(?:[\w*{},\s]+\s+from\s+)?['"](@\/[^'"]+)['"]/g;

function resolveLocalPath(importPath: string): string[] {
  // '@/components/Foo' → 'components/Foo'
  const base = importPath.replace(/^@\//, '');
  return [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
  ];
}

function buildStubContent(importPath: string, defaultName: string | null, namedExports: string[]): string {
  const isComponent = /\/(components|ui|layouts?|sections?)\//i.test(importPath);
  const lines: string[] = ["// Auto-generated stub — component was referenced but not generated"];
  const usedNames = new Set<string>();

  if (isComponent || defaultName) {
    const name = defaultName ?? (importPath.split('/').pop()!.replace(/[^a-zA-Z0-9]/g, '') || 'Stub');
    lines.push(`export default function ${name}() { return null }`);
    usedNames.add(name);
  }
  for (const n of namedExports) {
    if (usedNames.has(n)) continue; // already declared as the default export — skip to avoid duplicate identifier
    if (n.startsWith('use')) {
      lines.push(`export function ${n}() { return {} as Record<string, unknown> }`);
    } else if (/^[A-Z]/.test(n)) {
      // PascalCase → could be a component or type; export both
      lines.push(`export function ${n}() { return null }`);
      lines.push(`export type ${n}Props = Record<string, unknown>`);
    } else {
      lines.push(`export function ${n}(..._args: unknown[]) { return undefined }`);
    }
  }
  return lines.join('\n') + '\n';
}

export function generateMissingImportStubs(
  files: Record<string, string>
): Record<string, string> {
  const stubs: Record<string, string> = {};

  for (const content of Object.values(files)) {
    let m: RegExpExecArray | null;
    const re = new RegExp(IMPORT_RE.source, 'g');
    while ((m = re.exec(content)) !== null) {
      const importPath = m[1]; // e.g. '@/components/NewsletterForm'
      const candidates = resolveLocalPath(importPath);
      const exists = candidates.some((c) => c in files || c in stubs);
      if (exists) continue;

      // Parse what's imported from this path in the current statement
      const stmt = m[0];
      const defaultMatch = stmt.match(/import\s+(\w+)\s*(?:,|\s+from)/);
      const namedMatch = stmt.match(/\{([^}]+)\}/);
      const defaultName = defaultMatch?.[1] ?? null;
      const namedExports = namedMatch
        ? namedMatch[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()!).filter(Boolean)
        : [];

      // Place stub at the first candidate path (prefer .tsx)
      const stubPath = candidates[0];
      stubs[stubPath] = buildStubContent(importPath, defaultName, namedExports);
    }
  }

  return stubs;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runNextjsGenerationPipeline(
  userPrompt: string,
  siteName: string,
  onProgress?: ProgressCallback,
  onFile?: FileCallback,
  scaffoldType?: string
): Promise<PipelineResult> {
  const warnings: string[] = [];

  const isDashboard  = scaffoldType === 'dashboard';
  const isSaas       = scaffoldType === 'saas';
  const isEcommerce  = scaffoldType === 'ecommerce';
  const isBlog       = scaffoldType === 'blog';

  onProgress?.('nextjs-start', 'Starting Next.js + Supabase generation...');
  onProgress?.('nextjs-generating', 'Generating feature files with Claude...');

  // Each scaffold type gets extra pre-built components + a system prompt addon
  const systemPrompt = isDashboard
    ? NEXTJS_SYSTEM_PROMPT + DASHBOARD_SYSTEM_PROMPT_ADDON
    : isSaas
    ? NEXTJS_SYSTEM_PROMPT + SAAS_MULTITENANT_SYSTEM_PROMPT_ADDON
    : isEcommerce
    ? NEXTJS_SYSTEM_PROMPT + ECOMMERCE_NEXTJS_SYSTEM_PROMPT_ADDON
    : isBlog
    ? NEXTJS_SYSTEM_PROMPT + BLOG_NEXTJS_SYSTEM_PROMPT_ADDON
    : NEXTJS_SYSTEM_PROMPT;

  const dashboardScaffoldNote = isDashboard
    ? `\n- Pre-built dashboard components are in the scaffold: components/ui/sidebar.tsx, components/ui/data-table.tsx, components/ui/chart.tsx, components/ui/stat-card.tsx — USE THEM`
    : isSaas
    ? `\n- Pre-built SaaS components are in the scaffold: components/ui/org-switcher.tsx, components/ui/members-table.tsx, components/ui/invite-form.tsx, components/ui/plan-card.tsx — USE THEM`
    : isEcommerce
    ? `\n- Pre-built ecommerce components are in the scaffold: components/cart/CartContext.tsx (useCart hook), components/cart/CartDrawer.tsx, components/cart/CartButton.tsx, components/products/ProductCard.tsx — USE THEM. CartProvider + CartDrawer are already in app/layout.tsx.`
    : isBlog
    ? `\n- Pre-built blog components are in the scaffold: components/blog/ArticleCard.tsx, components/blog/CategoryPills.tsx, components/blog/NewsletterForm.tsx, components/blog/ReadingProgress.tsx — USE THEM`
    : '';

  const userMessage = `Build a complete Next.js app called "${siteName}".

USER REQUEST:
${userPrompt}

Remember:
- Output ONLY the feature-specific files in === FILE: path === format
- The scaffold is already provided: auth pages, Supabase clients, middleware, globals.css, package.json, app/layout.tsx, components/ui/toaster.tsx, lib/utils.ts (cn() with clsx + tailwind-merge — DO NOT regenerate it)${dashboardScaffoldNote}
- Generate: app/page.tsx, feature pages, ALL components you reference, types, and the Supabase SQL migration
- BACKEND REQUIRED — every full-stack app MUST have explicit REST API routes:
    app/api/[resource]/route.ts       ← export GET (list) + POST (create)
    app/api/[resource]/[id]/route.ts  ← export GET (single) + PATCH (update) + DELETE
  Generate one pair per data resource (e.g. workouts, meals, goals, tasks).
  Server Actions are fine for forms too, but these route files MUST exist.
- CRITICAL: Every import from '@/components/...' or '@/lib/...' or '@/hooks/...' that you write MUST have a corresponding === FILE: === block in your output
- Make it real and complete — no placeholders or TODOs`;

  let featureFiles: Record<string, string> = {};

  try {
    const response = await (anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 32000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }) as unknown as Promise<Anthropic.Message>);

    let text = response.content.find((b) => b.type === 'text')?.text ?? '';

    // ── Truncation detection ───────────────────────────────────────────────────
    // If Claude hit the token limit, the last === FILE: === block is probably
    // cut off mid-content. We do one continuation call to recover the rest.
    if (response.stop_reason === 'max_tokens' && text.trim().length > 0) {
      warnings.push('Output was truncated at token limit — attempting continuation...');
      onProgress?.('nextjs-continuing', 'Output truncated — continuing generation...');
      try {
        const cont = await (anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: text },
            { role: 'user', content: 'You were cut off. Continue from exactly where you left off — output only the remaining === FILE: === blocks you have not yet emitted. Do not repeat files already written.' },
          ],
        }) as unknown as Promise<Anthropic.Message>);
        const contText = cont.content.find((b) => b.type === 'text')?.text ?? '';
        if (contText.trim()) {
          text += '\n' + contText;
          // Merge continuation files (continuation overrides truncated last file)
          const contFiles = parseNextjsOutput(contText);
          featureFiles = { ...parseNextjsOutput(text), ...contFiles };
        }
        if (cont.stop_reason === 'max_tokens') {
          warnings.push('Continuation was also truncated — some files may be incomplete. Consider reducing scope.');
        }
      } catch (contErr: unknown) {
        warnings.push(`Continuation failed: ${contErr instanceof Error ? contErr.message : 'unknown'}`);
      }
    }

    onProgress?.('nextjs-parsing', 'Parsing generated files...');
    if (Object.keys(featureFiles).length === 0) {
      featureFiles = parseNextjsOutput(text);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    warnings.push(`Next.js generation error: ${msg}`);
  }

  // Merge scaffold + feature files (feature files override scaffold if same path)
  // Scaffold type determines which pre-built UI components are included.
  const scaffoldFiles = isDashboard
    ? getDashboardScaffoldFiles()
    : isSaas
    ? getSaasMultitenantScaffoldFiles()
    : isEcommerce
    ? getEcommerceScaffoldFiles()
    : isBlog
    ? getBlogScaffoldFiles()
    : getScaffoldFiles();
  const allFiles = { ...scaffoldFiles, ...featureFiles };

  // Force-restore scaffold files that must never be overwritten by generated code.
  // app/layout.tsx contains `export const dynamic = 'force-dynamic'` which prevents
  // the Next.js 15.5+ "workUnitAsyncStorage" crash. If Claude regenerates it without
  // that directive, every page fails with a RuntimeInvariantError.
  const PROTECTED_SCAFFOLD_FILES = [
    'app/layout.tsx',
    'lib/supabase/server.ts',
    'lib/supabase/client.ts',
    'lib/utils.ts',
    'middleware.ts',
  ];
  for (const path of PROTECTED_SCAFFOLD_FILES) {
    if (scaffoldFiles[path]) {
      allFiles[path] = scaffoldFiles[path];
    }
  }

  // Post-process: auto-stub any @/ imports that reference missing files
  const stubs = generateMissingImportStubs(allFiles);
  for (const [path, content] of Object.entries(stubs)) {
    allFiles[path] = content;
    warnings.push(`Auto-stubbed missing import: ${path}`);
  }

  // Stream files to client via onFile
  // Fire feature files first (they're what the user cares about), then scaffold
  for (const [path, content] of Object.entries(featureFiles)) {
    onProgress?.('nextjs-file', `Generated ${path}`);
    onFile?.(path, content);
  }

  for (const [path, content] of Object.entries(scaffoldFiles)) {
    onFile?.(path, content);
  }

  for (const [path, content] of Object.entries(stubs)) {
    onFile?.(path, content);
  }

  const fileCount = Object.keys(allFiles).length;
  onProgress?.('nextjs-done', `Done — ${fileCount} files generated`);

  return {
    success: 'app/page.tsx' in featureFiles || 'app/layout.tsx' in featureFiles,
    files: allFiles,
    mode: 'nextjs',
    pages: Object.keys(allFiles).filter(
      (f) => f.startsWith('app/') && f.endsWith('/page.tsx')
    ),
    warnings,
    errors: [],
    qualityScore: 'app/page.tsx' in featureFiles ? 85 : 40,
  };
}
