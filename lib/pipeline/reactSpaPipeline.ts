// ============================================================
// lib/pipeline/reactSpaPipeline.ts
// ============================================================
// Generation pipeline for React SPA projects.
// Analogous to nextjsGenerationPipeline.ts but outputs:
//   - A Vite project (full file set for download/deploy)
//   - A preview index.html (self-contained, no npm needed)
//
// Called from the stream route when mode === 'react-spa'.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { REACT_SPA_SYSTEM_PROMPT, parseReactSpaOutput } from '@/lib/generation/reactSpaPrompt';
import { getReactSpaScaffoldFiles, buildPreviewHtml } from '@/lib/scaffold/reactSpaScaffold';
import type { ProgressCallback, FileCallback, PipelineResult } from './htmlGenerationPipeline';

const anthropic = new Anthropic();

// ── Token budget ──────────────────────────────────────────────────────────────
// React SPA needs more tokens than Next.js because all components
// and their styles are co-located in JSX rather than split across
// .tsx + .css + tailwind.config.
const SPA_MAX_TOKENS = 32000;

// ── Missing component stub generator ─────────────────────────────────────────
// Same pattern as nextjsGenerationPipeline.ts's generateMissingImportStubs().
// Scans all import statements across generated files and creates minimal
// stubs for any that don't resolve to an existing file.

const IMPORT_RE = /(?:import\s+(?:[\w*{},\s]+\s+from\s+)?['"])(\.\.?\/[^'"]+)['"]/g;

function resolveRelativePath(importPath: string, callerPath: string): string[] {
  const callerDir = callerPath.split('/').slice(0, -1).join('/');
  const parts = `${callerDir}/${importPath}`.split('/');
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === '..') resolved.pop();
    else if (p !== '.') resolved.push(p);
  }
  const base = resolved.join('/');
  return [
    `${base}.jsx`,
    `${base}.js`,
    `${base}/index.jsx`,
    `${base}/index.js`,
  ];
}

function buildComponentStub(path: string): string {
  const name = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Component';
  const isHook = name.startsWith('use') && name[3] === name[3].toUpperCase();
  if (isHook) {
    return `// Auto-generated stub\nexport function ${name}(...args) { return {}; }\nexport default ${name};`;
  }
  return `// Auto-generated stub\nimport React from 'react';\nexport default function ${name}() { return null; }`;
}

export function generateMissingSpaStubs(files: Record<string, string>): Record<string, string> {
  const stubs: Record<string, string> = {};
  for (const [callerPath, content] of Object.entries(files)) {
    const re = new RegExp(IMPORT_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const importPath = m[1];
      const candidates = resolveRelativePath(importPath, callerPath);
      const exists = candidates.some(c => c in files || c in stubs);
      if (!exists) {
        const stubPath = candidates[0];
        stubs[stubPath] = buildComponentStub(stubPath);
      }
    }
  }
  return stubs;
}

// ── Phase detection ────────────────────────────────────────────────────────────
// For complex prompts, we can decompose into phases (same as Next.js).
// Phase 1: core layout + home page
// Phase 2: remaining pages + components
// For simplicity, single-phase generation covers most use cases.
// Multi-phase kicks in for prompts with 5+ detected pages.

function countMentionedPages(prompt: string): number {
  const pageWords = ['page', 'screen', 'view', 'section', 'route'];
  const count = pageWords.reduce((n, w) => {
    const re = new RegExp(`\\b${w}s?\\b`, 'gi');
    return n + (prompt.match(re)?.length ?? 0);
  }, 0);
  return Math.min(Math.max(count, 1), 10);
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runReactSpaPipeline(
  userPrompt: string,
  siteName: string,
  onProgress?: ProgressCallback,
  onFile?: FileCallback,
): Promise<PipelineResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  onProgress?.('react-spa-start', 'Starting React SPA generation...');

  // ── Step 1: Generate feature files with Claude ────────────────────────────

  const pageCount = countMentionedPages(userPrompt);
  const usePhases = pageCount >= 5;

  let featureFiles: Record<string, string> = {};

  if (usePhases) {
    // Phase 1: Core layout + home page
    onProgress?.('react-spa-phase1', 'Generating core layout and home page...');
    const { files: phase1Files, truncated: p1Truncated } = await generatePhase(
      userPrompt,
      siteName,
      `PHASE 1: Generate ONLY the core structure:
- src/main.jsx
- src/App.jsx (with HashRouter, all route stubs)
- src/components/Navbar.jsx (fully styled, all nav links)
- src/components/Footer.jsx (fully styled)
- src/pages/Home.jsx (complete, production-quality, all sections)
- src/styles/globals.css (complete :root tokens + body styles)
- src/hooks/useScrollReveal.js
- package.json, vite.config.js
Other page files are stubs only — real content comes in phase 2.`
    );
    if (p1Truncated) warnings.push('Phase 1 generation was truncated — some files may be incomplete.');
    featureFiles = { ...featureFiles, ...phase1Files };

    // Stream phase 1 files immediately
    for (const [path, content] of Object.entries(phase1Files)) {
      onProgress?.('react-spa-file', `Generated ${path}`);
      onFile?.(path, content);
    }

    // Phase 2: Remaining pages
    onProgress?.('react-spa-phase2', 'Generating remaining pages and components...');
    const existingPaths = Object.keys(featureFiles).join(', ');
    const { files: phase2Files, truncated: p2Truncated } = await generatePhase(
      userPrompt,
      siteName,
      `PHASE 2: The following files already exist: ${existingPaths}
Generate ONLY the remaining page files and shared components NOT in the above list.
Do NOT regenerate src/main.jsx, src/App.jsx, src/styles/globals.css, or package.json.
Make every page complete — full content, real data, production quality.`
    );
    if (p2Truncated) warnings.push('Phase 2 generation was truncated — some files may be incomplete.');
    featureFiles = { ...featureFiles, ...phase2Files };

    for (const [path, content] of Object.entries(phase2Files)) {
      onProgress?.('react-spa-file', `Generated ${path}`);
      onFile?.(path, content);
    }

  } else {
    // Single phase — everything in one call
    onProgress?.('react-spa-generating', 'Generating React SPA...');
    const { files: singleFiles, truncated } = await generatePhase(userPrompt, siteName,
      'Generate the complete React SPA — all pages, components, hooks, and config files.');
    if (truncated) warnings.push('Generation was truncated at token limit — some files may be incomplete.');
    featureFiles = singleFiles;
    for (const [path, content] of Object.entries(featureFiles)) {
      onProgress?.('react-spa-file', `Generated ${path}`);
      onFile?.(path, content);
    }
  }

  // ── Step 2: Merge scaffold + feature files ────────────────────────────────
  // Scaffold provides fallbacks; feature files override at the same path.

  const scaffoldFiles = getReactSpaScaffoldFiles();
  const allFiles: Record<string, string> = { ...scaffoldFiles, ...featureFiles };

  // Protect critical scaffold files that must not be overridden
  // (main.jsx entry point must always use the BuildFlow-compatible form)
  allFiles['src/main.jsx'] = scaffoldFiles['src/main.jsx'];

  // ── Step 3: Auto-stub missing imports ─────────────────────────────────────

  const stubs = generateMissingSpaStubs(allFiles);
  for (const [path, content] of Object.entries(stubs)) {
    allFiles[path] = content;
    warnings.push(`Auto-stubbed missing component: ${path}`);
    onFile?.(path, content);
  }

  // ── Step 4: Build preview HTML ────────────────────────────────────────────
  // Single self-contained index.html for the iframe preview.
  // Emitted as a special file so the chatbuilder can detect it.

  onProgress?.('react-spa-preview', 'Building preview...');
  const previewHtml = buildPreviewHtml(allFiles, siteName);
  allFiles['_preview/index.html'] = previewHtml;
  onFile?.('_preview/index.html', previewHtml);

  // ── Step 5: Update index.html title from App.jsx ──────────────────────────
  // The Vite index.html is generic — update its <title> from the
  // site name Claude used in the generated components.

  const appContent = allFiles['src/App.jsx'] ?? '';
  const siteNameFromApp = extractSiteName(appContent) ?? siteName;
  allFiles['index.html'] = allFiles['index.html']
    .replace('<title>App</title>', `<title>${escapeHtml(siteNameFromApp)}</title>`);
  onFile?.('index.html', allFiles['index.html']);

  // ── Step 6: Emit remaining scaffold files ─────────────────────────────────

  for (const [path, content] of Object.entries(scaffoldFiles)) {
    if (!(path in featureFiles)) {
      onFile?.(path, content);
    }
  }

  onProgress?.('react-spa-done', `Done — ${Object.keys(allFiles).length} files`);

  const pageFiles = Object.keys(allFiles).filter(f => f.startsWith('src/pages/'));

  return {
    success: 'src/App.jsx' in featureFiles && 'src/pages/Home.jsx' in featureFiles,
    files: allFiles,
    mode: 'react-spa',
    pages: pageFiles,
    warnings,
    errors,
    qualityScore: computeSpaQualityScore(featureFiles, stubs),
  };
}

// ── Phase generator ────────────────────────────────────────────────────────────

async function generatePhase(
  userPrompt: string,
  siteName: string,
  phaseInstruction: string,
): Promise<{ files: Record<string, string>; truncated: boolean }> {
  const userContent = `Build a React SPA called "${siteName}".

USER REQUEST:
${userPrompt}

${phaseInstruction}

Critical reminders:
- Use HashRouter (not BrowserRouter) — no server needed for routing
- Every import MUST have a corresponding === FILE: === block
- Tailwind CDN is available — use className with Tailwind utilities
- No placeholder content — invent specific, believable content
- Every page needs the reveal animation pattern from useScrollReveal
- Use picsum.photos with topic-specific seeds for all images`;

  try {
    const response = await (anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: SPA_MAX_TOKENS,
      system: REACT_SPA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }) as unknown as Promise<Anthropic.Message>);

    let text = (response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? '';
    let wasTruncated = response.stop_reason === 'max_tokens';

    // ── Truncation recovery ────────────────────────────────────────────────────
    if (wasTruncated && text.trim().length > 0) {
      try {
        const cont = await (anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: REACT_SPA_SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: userContent },
            { role: 'assistant', content: text },
            { role: 'user', content: 'You were cut off. Continue from exactly where you left off — output only the remaining === FILE: === blocks not yet emitted. Do not repeat files already written.' },
          ],
        }) as unknown as Promise<Anthropic.Message>);
        const contText = (cont.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? '';
        if (contText.trim()) text += '\n' + contText;
        wasTruncated = cont.stop_reason === 'max_tokens';
      } catch (contErr) {
        console.error('[ReactSpaPipeline] Continuation failed:', contErr);
      }
    }

    return { files: parseReactSpaOutput(text), truncated: wasTruncated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    console.error('[ReactSpaPipeline] Phase generation error:', msg);
    return { files: {}, truncated: false };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractSiteName(appContent: string): string | null {
  // Look for siteName prop or string literal in Navbar usage
  const m = appContent.match(/siteName=["']([^"']+)["']/) ??
            appContent.match(/<Navbar[^>]+>.*?<\/Navbar>/s);
  return m ? m[1] : null;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function computeSpaQualityScore(
  featureFiles: Record<string, string>,
  stubs: Record<string, string>
): number {
  let score = 100;
  // Missing critical files
  if (!('src/App.jsx' in featureFiles))        score -= 20;
  if (!('src/pages/Home.jsx' in featureFiles)) score -= 20;
  if (!('src/components/Navbar.jsx' in featureFiles)) score -= 10;
  if (!('src/components/Footer.jsx' in featureFiles)) score -= 10;
  // Too many stubs = generation was incomplete
  score -= Math.min(Object.keys(stubs).length * 5, 30);
  return Math.max(0, score);
}
