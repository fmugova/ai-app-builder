// lib/pipeline/nextjsGenerationPipeline.ts
// Next.js + Supabase generation pipeline.
// Generates feature-specific files on top of the pre-built scaffold.
// Output is streamed via onFile as each === FILE: path === block is parsed.

import Anthropic from '@anthropic-ai/sdk';
import { NEXTJS_SYSTEM_PROMPT, parseNextjsOutput } from '@/lib/generation/nextjsPrompt';
import { getScaffoldFiles } from '@/lib/scaffold/nextjs-scaffold';
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
  onFile?: FileCallback
): Promise<PipelineResult> {
  const warnings: string[] = [];

  onProgress?.('nextjs-start', 'Starting Next.js + Supabase generation...');
  onProgress?.('nextjs-generating', 'Generating feature files with Claude...');

  const userMessage = `Build a complete Next.js app called "${siteName}".

USER REQUEST:
${userPrompt}

Remember:
- Output ONLY the feature-specific files in === FILE: path === format
- The scaffold is already provided: auth pages, Supabase clients, middleware, globals.css, package.json, app/layout.tsx, components/ui/toaster.tsx
- Generate: app/page.tsx, feature pages, API routes, ALL components you reference, types, and the Supabase SQL migration
- CRITICAL: Every import from '@/components/...' or '@/lib/...' or '@/hooks/...' that you write MUST have a corresponding === FILE: === block in your output
- Make it real and complete — no placeholders or TODOs`;

  let featureFiles: Record<string, string> = {};

  try {
    const response = await (anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: NEXTJS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }) as unknown as Promise<Anthropic.Message>);

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';

    onProgress?.('nextjs-parsing', 'Parsing generated files...');
    featureFiles = parseNextjsOutput(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    warnings.push(`Next.js generation error: ${msg}`);
  }

  // Merge scaffold + feature files (feature files override scaffold if same path)
  const scaffoldFiles = getScaffoldFiles();
  const allFiles = { ...scaffoldFiles, ...featureFiles };

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
