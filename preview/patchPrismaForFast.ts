/**
 * preview/patchPrismaForFast.ts
 * Patches a flat-file project tree so it can boot in WebContainer without
 * native binaries or real DB credentials.
 *
 * Patches applied:
 * 1. package.json — strip native deps, fix dev script to bind 0.0.0.0:3000
 * 2. prisma/ schema + client — removed (avoids postinstall engine download)
 * 3. Prisma wrapper (scan.detected.prismaWrapperPath) — replaced with in-memory mock
 * 4. middleware.ts — replaced with passthrough (only when scan.detected.hasMiddleware)
 * 5. .env.local — placeholder env vars so process.env reads don't throw
 */

import type { ScanResult } from './scan';
import { prismaMockModule } from './prismaMock';

type FlatFiles = Record<string, string>;

// WebContainer expects { directory: { [name]: node } | { file: { contents } } }
type MountTree = Record<string, unknown>;

export interface PatchResult {
  files: FlatFiles;
  applied: string[];
  notes: string[];
}

const NATIVE_PKGS = [
  'bcrypt', 'argon2', 'sharp', 'canvas', 'sqlite3', 'better-sqlite3',
  'node-gyp', 'libpq', 'pg-native', '@prisma/client', 'prisma',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function patchNextDevScript(pkg: Record<string, any>, notes: string[]) {
  if (pkg.scripts?.dev) {
    const dev = pkg.scripts.dev as string;
    if (!dev.includes('-H 0.0.0.0') && !dev.includes('--hostname')) {
      pkg.scripts.dev = dev.replace(/next dev(\s|$)/, 'next dev -H 0.0.0.0 -p 3000$1');
      notes.push('Patched dev script → next dev -H 0.0.0.0 -p 3000');
    }
  } else {
    pkg.scripts = pkg.scripts ?? {};
    pkg.scripts.dev = 'next dev -H 0.0.0.0 -p 3000';
    notes.push('Added dev script → next dev -H 0.0.0.0 -p 3000');
  }
}

function patchPrismaFiles(patched: FlatFiles, scan: ScanResult, applied: string[], notes: string[]) {
  // Remove schema / generated engine files
  for (const path of Object.keys(patched)) {
    if (path.startsWith('prisma/') || path.includes('.prisma/client')) {
      delete patched[path];
    }
  }
  applied.push('prisma-schema-removed');
  notes.push('Removed prisma/ directory (avoids native engine download)');

  // Replace the Prisma wrapper with the in-memory mock
  const wrapperPath = scan.detected.prismaWrapperPath ?? 'lib/prisma.ts';
  patched[wrapperPath] = prismaMockModule();
  applied.push('prisma-wrapper-mocked');
  notes.push(`Replaced ${wrapperPath} with in-memory mock`);
}

function patchMiddleware(patched: FlatFiles, notes: string[]) {
  const mwPath = 'middleware.ts' in patched ? 'middleware.ts' : 'middleware.js';
  patched[mwPath] = `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(_req: NextRequest) { return NextResponse.next(); }
export const config = { matcher: [] };
`;
  notes.push('Replaced middleware with passthrough');
}

// ── Main export ───────────────────────────────────────────────────────────────

export function patchForFastPreview(
  files: FlatFiles,
  scan: ScanResult,
): PatchResult {
  const patched = { ...files };
  const applied: string[] = [];
  const notes: string[] = [];

  // ── 1. package.json ─────────────────────────────────────────────────────
  if (patched['package.json']) {
    try {
      const pkg = JSON.parse(patched['package.json']);

      // Remove native / Prisma deps from all dep sections
      for (const section of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        if (!pkg[section]) continue;
        for (const name of NATIVE_PKGS) {
          if (name in pkg[section]) {
            delete pkg[section][name];
            notes.push(`Removed ${name} from ${section}`);
          }
        }
      }

      // Remove postinstall (often runs prisma generate, bcrypt rebuild, etc.)
      if (pkg.scripts?.postinstall) {
        delete pkg.scripts.postinstall;
        notes.push('Removed postinstall script');
      }

      // Ensure dev server binds on all interfaces
      patchNextDevScript(pkg, notes);
      applied.push('package-json-patched');

      patched['package.json'] = JSON.stringify(pkg, null, 2);
    } catch {
      notes.push('Could not patch package.json (invalid JSON)');
    }
  }

  // ── 2 + 3. Prisma engine files + wrapper mock ────────────────────────────
  if (scan.detected.prisma) {
    patchPrismaFiles(patched, scan, applied, notes);
  }

  // ── 4. Passthrough middleware ─────────────────────────────────────────────
  if (scan.detected.hasMiddleware) {
    patchMiddleware(patched, notes);
    applied.push('middleware-patched');
  }

  // ── 5. Placeholder .env.local ────────────────────────────────────────────
  if (!patched['.env.local']) {
    const envLines = [
      '# Auto-generated for Fast Preview — replace with real values for Full Preview',
      'NEXT_PUBLIC_APP_URL=http://localhost:3000',
      'NEXTAUTH_URL=http://localhost:3000',
      'NEXTAUTH_SECRET=fast-preview-secret',
    ];
    if (scan.detected.hasDatabaseUrl) {
      envLines.push('DATABASE_URL=postgresql://mock:mock@localhost:5432/mock');
    }
    if (scan.detected.supabase) {
      envLines.push('NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co');
      envLines.push('NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder');
    }
    patched['.env.local'] = envLines.join('\n');
    applied.push('env-local-added');
    notes.push('Added placeholder .env.local');
  }

  return { files: patched, applied, notes };
}

/**
 * Convert a flat files Record<path, content> to the nested MountTree
 * format expected by @webcontainer/api's wc.mount().
 */
export function toMountTree(files: FlatFiles): MountTree {
  const root: MountTree = {};

  for (const [fullPath, contents] of Object.entries(files)) {
    const parts = fullPath.split('/').filter(Boolean);
    let curr = root;

    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        curr[part] = { file: { contents } };
      } else {
        if (!curr[part]) curr[part] = { directory: {} };
        curr = (curr[part] as { directory: MountTree }).directory;
      }
    });
  }

  return root;
}
