// lib/pipeline/nextjsGenerationPipeline.ts
// Next.js + Supabase generation pipeline.
// Generates feature-specific files on top of the pre-built scaffold.
// Output is streamed via onFile as each === FILE: path === block is parsed.

import Anthropic from '@anthropic-ai/sdk';
import { NEXTJS_SYSTEM_PROMPT, parseNextjsOutput } from '@/lib/generation/nextjsPrompt';
import { getScaffoldFiles } from '@/lib/scaffold/nextjs-scaffold';
import type { ProgressCallback, FileCallback, PipelineResult } from './htmlGenerationPipeline';

const anthropic = new Anthropic();

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
- The scaffold (auth pages, Supabase clients, middleware, globals.css, package.json, etc.) is already provided
- Generate app/layout.tsx, app/page.tsx, feature pages, API routes, components, types, and the Supabase SQL migration
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

  // Stream files to client via onFile
  // Fire feature files first (they're what the user cares about), then scaffold
  for (const [path, content] of Object.entries(featureFiles)) {
    onProgress?.('nextjs-file', `Generated ${path}`);
    onFile?.(path, content);
  }

  for (const [path, content] of Object.entries(scaffoldFiles)) {
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
