// lib/pipeline/pipelineRouter.ts
// ============================================================
// Top-level router that delegates to the correct sub-pipeline
// based on detected mode. Can be used from API routes or the UI
// to select the appropriate generation strategy.
// ============================================================

import { detectOutputMode } from '@/lib/generation/detectOutputMode';
import { selectScaffold } from '@/lib/scaffolds/scaffold-selector';
import { runGenerationPipeline } from '@/lib/pipeline/htmlGenerationPipeline';
import { runNextjsGenerationPipeline } from '@/lib/pipeline/nextjsGenerationPipeline';
import { runReactSpaPipeline } from '@/lib/pipeline/reactSpaPipeline';
import type { ProgressCallback, FileCallback, PipelineResult, DbConnection } from './htmlGenerationPipeline';

export interface RouterConfig {
  userPrompt: string;
  siteName: string;
  onProgress?: ProgressCallback;
  onFile?: FileCallback;
  dbConnection?: DbConnection | null;
  // Force a specific pipeline (used when user selects from the UI)
  forcePipeline?: 'html' | 'react-spa' | 'nextjs';
}

export async function routeGenerationPipeline(config: RouterConfig): Promise<PipelineResult> {
  const {
    userPrompt, siteName, onProgress, onFile,
    dbConnection, forcePipeline,
  } = config;

  // Determine the pipeline to use
  const detection = detectOutputMode(userPrompt);

  // forcePipeline overrides detection (user explicitly chose from UI)
  const mode = forcePipeline ?? detection.mode;

  onProgress?.('routing', `Pipeline: ${mode} (${forcePipeline ? 'user selected' : `${detection.confidence} confidence`})`);

  switch (mode) {
    case 'nextjs': {
      const scaffoldResult = selectScaffold(userPrompt);
      return runNextjsGenerationPipeline(
        userPrompt, siteName, onProgress, onFile,
        scaffoldResult.scaffold
      );
    }

    case 'react-spa':
      return runReactSpaPipeline(
        userPrompt, siteName, onProgress, onFile
      );

    case 'html':
    default:
      return runGenerationPipeline(
        userPrompt, siteName, onProgress, onFile, dbConnection
      );
  }
}

// ── Mode selector helper ───────────────────────────────────────────────────────
// Called by the UI to show the user which pipeline was selected
// and optionally let them override it.

export function suggestPipeline(userPrompt: string): {
  suggested: 'html' | 'react-spa' | 'nextjs';
  reason: string;
  alternatives: Array<{ mode: string; label: string; reason: string }>;
} {
  const detection = detectOutputMode(userPrompt);

  const reasons: Record<string, string> = {
    'html':       'Multi-page website — fast preview, deploys anywhere',
    'react-spa':  'Interactive single-page app — React Router, component-based',
    'nextjs':     'Full-stack app — server-side rendering, API routes, Supabase',
  };

  return {
    suggested: detection.mode as 'html' | 'react-spa' | 'nextjs',
    reason: reasons[detection.mode] ?? reasons['html'],
    alternatives: (['html', 'react-spa', 'nextjs'] as const)
      .filter(m => m !== detection.mode)
      .map(m => ({ mode: m, label: m, reason: reasons[m] })),
  };
}
