/**
 * preview/patchPrismaForFast.ts
 * Patches a flat-file project tree so it can boot in WebContainer without
 * native binaries or real DB credentials.
 *
 * Patches applied:
 * 1. package.json — strip native deps, fix dev script to bind 0.0.0.0:3000
 * 2. prisma/ — remove schema + generated client (avoids postinstall engine download)
 * 3. lib/prisma.ts — replace with in-memory mock
 * 4. middleware.ts — replace with passthrough (avoids edge-runtime issues)
 * 5. .env.local — add placeholder env vars so process.env reads don't throw
 */

import type { ScanResult } from './scan';
import { generatePrismaMock } from './prismaMock';

type FlatFiles = Record<string, string>;

// WebContainer expects { directory: { [name]: { file: { contents } } } | { file: { contents } } }
type MountTree = Record<string, unknown>;

const NATIVE_PKGS = [
  'bcrypt', 'argon2', 'sharp', 'canvas', 'sqlite3', 'better-sqlite3',
  'node-gyp', 'libpq', 'pg-native', '@prisma/client', 'prisma',
];

export function patchForFastPreview(
  files: FlatFiles,
  scan: ScanResult
): { files: FlatFiles; notes: string[] } {
  const patched = { ...files };
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

      // Force dev server to bind on all interfaces and port 3000
      if (pkg.scripts?.dev) {
        const dev = pkg.scripts.dev as string;
        if (!dev.includes('-H 0.0.0.0') && !dev.includes('--hostname')) {
          pkg.scripts.dev = dev.replace(/next dev/, 'next dev -H 0.0.0.0 -p 3000');
          notes.push('Patched dev script → next dev -H 0.0.0.0 -p 3000');
        }
      } else {
        pkg.scripts = pkg.scripts ?? {};
        pkg.scripts.dev = 'next dev -H 0.0.0.0 -p 3000';
        notes.push('Added dev script → next dev -H 0.0.0.0 -p 3000');
      }

      patched['package.json'] = JSON.stringify(pkg, null, 2);
    } catch {
      notes.push('Could not patch package.json (invalid JSON)');
    }
  }

  // ── 2. Remove Prisma engine files ────────────────────────────────────────
  if (scan.detected.prisma) {
    for (const path of Object.keys(patched)) {
      if (path.startsWith('prisma/') || path.includes('.prisma/client')) {
        delete patched[path];
      }
    }
    notes.push('Removed prisma/ directory (avoids native engine download)');

    // ── 3. Replace lib/prisma.ts with mock ──────────────────────────────────
    const prismaPaths = ['lib/prisma.ts', 'lib/prisma.js', 'src/lib/prisma.ts', 'utils/prisma.ts'];
    const existing = prismaPaths.find(p => p in patched) ?? 'lib/prisma.ts';
    patched[existing] = generatePrismaMock();
    notes.push(`Replaced ${existing} with in-memory mock`);
  }

  // ── 4. Passthrough middleware ─────────────────────────────────────────────
  if (patched['middleware.ts'] || patched['middleware.js']) {
    const mwPath = patched['middleware.ts'] ? 'middleware.ts' : 'middleware.js';
    patched[mwPath] = `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(_req: NextRequest) { return NextResponse.next(); }
export const config = { matcher: [] };
`;
    notes.push('Replaced middleware with passthrough');
  }

  // ── 5. Placeholder .env.local ────────────────────────────────────────────
  if (!patched['.env.local']) {
    patched['.env.local'] = [
      '# Auto-generated for Fast Preview — replace with real values for Full Preview',
      'NEXT_PUBLIC_APP_URL=http://localhost:3000',
      'DATABASE_URL=postgresql://mock:mock@localhost:5432/mock',
      'NEXTAUTH_URL=http://localhost:3000',
      'NEXTAUTH_SECRET=fast-preview-secret',
      'NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder',
    ].join('\n');
    notes.push('Added placeholder .env.local');
  }

  return { files: patched, notes };
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
        // Leaf — file node
        curr[part] = { file: { contents } };
      } else {
        // Directory node
        if (!curr[part]) curr[part] = { directory: {} };
        curr = (curr[part] as { directory: MountTree }).directory;
      }
    });
  }

  return root;
}
