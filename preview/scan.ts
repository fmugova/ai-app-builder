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
    nativeDeps: boolean;
    envRequired: boolean;
  };
  recommended: 'fast' | 'full';
  reasons: string[];
  warnings: string[];
}

const NATIVE_PKGS = [
  'bcrypt', 'bcryptjs', 'argon2', 'sharp', 'canvas', 'sqlite3',
  'better-sqlite3', 'node-gyp', 'libpq', 'pg-native',
];

export function scanProject(files: FlatFiles): ScanResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const paths = Object.keys(files);
  const allContent = Object.values(files).join('\n');

  // Detect Prisma
  const hasPrismaSchema = paths.some(p => p.endsWith('schema.prisma'));
  const hasPrismaImport = allContent.includes('@prisma/client') || allContent.includes('prisma/client');
  const prisma = hasPrismaSchema || hasPrismaImport;

  // Detect Supabase
  const supabase = allContent.includes('@supabase/supabase-js') || allContent.includes('supabase-js');

  // Detect Next.js
  const pkgJson = files['package.json'] ? JSON.parse(files['package.json'] || '{}') : {};
  const deps = { ...(pkgJson.dependencies ?? {}), ...(pkgJson.devDependencies ?? {}) };
  const nextApp = 'next' in deps || paths.some(p => p === 'next.config.ts' || p === 'next.config.js');

  // Detect native/binary deps that can't run in WebContainer
  const nativeDeps = NATIVE_PKGS.some(pkg => pkg in deps);

  // Detect required env vars (server-side secrets)
  const envRequired =
    allContent.includes('process.env.DATABASE_URL') ||
    allContent.includes('process.env.STRIPE_') ||
    allContent.includes('process.env.ANTHROPIC_') ||
    paths.some(p => p === '.env.example' || p === '.env.local');

  // Scoring
  let fullScore = 0;

  if (prisma) {
    fullScore += 2;
    warnings.push('Prisma detected — DB calls will use mocked data in Fast Preview');
  }
  if (nativeDeps) {
    fullScore += 3;
    reasons.push('Native binary dependencies cannot run in-browser');
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
  }

  return { detected: { prisma, supabase, nextApp, nativeDeps, envRequired }, recommended, reasons, warnings };
}
