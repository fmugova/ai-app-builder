/**
 * preview/scan.ts
 * Scans generated project files to decide between Fast Preview (WebContainer)
 * and Full Preview (Vercel deployment).
 */

type FlatFiles = Record<string, string>;

export interface ScanResult {
  detected: {
    prisma: boolean;
    supabase: boolean;
    nextApp: boolean;
    /** True string list of native packages found in package.json */
    nativeDeps: string[];
    envRequired: boolean;
    /** Path to the file that wraps/exports the Prisma client (e.g. 'lib/prisma.ts') */
    prismaWrapperPath: string | null;
    /** True when Prisma only flows through the wrapper (few direct @prisma/client imports) */
    canAutoPatchToFast: boolean;
    /** Whether a middleware.ts / middleware.js file exists */
    hasMiddleware: boolean;
    /** Whether DATABASE_URL is referenced in any file */
    hasDatabaseUrl: boolean;
    /** Detected framework: 'next' | 'vite' | 'cra' | 'unknown' */
    framework: 'next' | 'vite' | 'cra' | 'unknown';
    /** Path to prisma/schema.prisma if present */
    prismaSchemaPath: string | null;
  };
  recommended: 'fast' | 'full';
  reasons: string[];
  warnings: string[];
}

const NATIVE_PKGS = [
  'bcrypt', 'argon2', 'sharp', 'canvas', 'sqlite3',
  'better-sqlite3', 'node-gyp', 'libpq', 'pg-native',
];

/** Candidates for the Prisma wrapper file, in priority order */
const PRISMA_WRAPPER_CANDIDATES = [
  'lib/prisma.ts', 'lib/prisma.js',
  'src/lib/prisma.ts', 'src/lib/prisma.js',
  'utils/prisma.ts', 'utils/prisma.js',
  'lib/db.ts', 'lib/db.js',
];

export function scanProject(files: FlatFiles): ScanResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const paths = Object.keys(files);
  const allContent = Object.values(files).join('\n');

  // ── Package.json parsing ────────────────────────────────────────────────
  let pkgJson: Record<string, any> = {};
  try { pkgJson = files['package.json'] ? JSON.parse(files['package.json']) : {}; } catch { /* ignore */ }
  const deps: Record<string, string> = { ...(pkgJson.dependencies ?? {}), ...(pkgJson.devDependencies ?? {}) };

  // ── Framework detection ─────────────────────────────────────────────────
  let framework: ScanResult['detected']['framework'] = 'unknown';
  if ('next' in deps || paths.some(p => p === 'next.config.ts' || p === 'next.config.js' || p === 'next.config.mjs')) {
    framework = 'next';
  } else if ('vite' in deps || paths.some(p => p === 'vite.config.ts' || p === 'vite.config.js')) {
    framework = 'vite';
  } else if ('react-scripts' in deps) {
    framework = 'cra';
  }

  const nextApp = framework === 'next';

  // ── Prisma detection ────────────────────────────────────────────────────
  const hasPrismaSchema = paths.some(p => p.endsWith('schema.prisma'));
  const prismaSchemaPath = paths.find(p => p.endsWith('schema.prisma')) ?? null;
  const hasPrismaImport = allContent.includes('@prisma/client') || allContent.includes('prisma/client');
  const prisma = hasPrismaSchema || hasPrismaImport;

  // Find the Prisma wrapper file
  const prismaWrapperPath = PRISMA_WRAPPER_CANDIDATES.find(p => p in files) ?? null;

  // canAutoPatchToFast: true when @prisma/client is imported in very few files
  // (meaning most code goes through the wrapper, which we can swap out cleanly)
  let canAutoPatchToFast = false;
  if (prisma && prismaWrapperPath) {
    const directImportCount = paths.filter(p => {
      if (p === prismaWrapperPath) return false; // the wrapper itself is expected to import it
      const content = files[p] ?? '';
      return content.includes("from '@prisma/client'") || content.includes('from "@prisma/client"');
    }).length;
    canAutoPatchToFast = directImportCount <= 2;
  }

  // ── Supabase detection ──────────────────────────────────────────────────
  const supabase = allContent.includes('@supabase/supabase-js') || allContent.includes('supabase-js');

  // ── Native deps ─────────────────────────────────────────────────────────
  const nativeDeps = NATIVE_PKGS.filter(pkg => pkg in deps);

  // ── Middleware ──────────────────────────────────────────────────────────
  const hasMiddleware = 'middleware.ts' in files || 'middleware.js' in files;

  // ── Env vars ────────────────────────────────────────────────────────────
  const hasDatabaseUrl = allContent.includes('process.env.DATABASE_URL');
  const envRequired =
    hasDatabaseUrl ||
    allContent.includes('process.env.STRIPE_') ||
    allContent.includes('process.env.ANTHROPIC_') ||
    paths.some(p => p === '.env.example' || p === '.env.local');

  // ── Scoring ─────────────────────────────────────────────────────────────
  let fullScore = 0;

  if (prisma) {
    fullScore += 2;
    warnings.push('Prisma detected — DB calls will use mocked data in Fast Preview');
  }
  if (nativeDeps.length > 0) {
    fullScore += 3;
    reasons.push(`Native binary dependencies cannot run in-browser: ${nativeDeps.join(', ')}`);
  }
  if (supabase && envRequired) {
    fullScore += 1;
    warnings.push('Supabase env vars required — use real keys or they will be empty');
  }
  if (!nextApp) {
    reasons.push('Not a Next.js project — Full Preview recommended for accurate rendering');
    fullScore += 1;
  }

  const recommended: 'fast' | 'full' = fullScore >= 3 ? 'full' : 'fast';

  if (recommended === 'fast') {
    reasons.push('Next.js app with no blocking native dependencies — Fast Preview supported');
    if (prisma && canAutoPatchToFast) {
      reasons.push('Prisma wrapper detected — will be replaced with in-memory mock automatically');
    }
  }

  return {
    detected: {
      prisma,
      supabase,
      nextApp,
      nativeDeps,
      envRequired,
      prismaWrapperPath,
      canAutoPatchToFast,
      hasMiddleware,
      hasDatabaseUrl,
      framework,
      prismaSchemaPath,
    },
    recommended,
    reasons,
    warnings,
  };
}
