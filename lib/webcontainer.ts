/**
 * WebContainer Service — Singleton manager for running Next.js dev servers in the browser.
 * Uses StackBlitz's WebContainer API to execute Node.js in a WASM sandbox.
 */

import type { WebContainer, FileSystemTree } from '@webcontainer/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WebContainerFile {
  path: string;
  content: string;
}

export type OutputCallback = (data: string) => void;
export type ServerReadyCallback = (port: number, url: string) => void;

// ── Singleton ──────────────────────────────────────────────────────────────
// Store on globalThis so the instance survives HMR reloads.
// Turbopack/Webpack re-execute module code on HMR, resetting module-level
// variables, but the WebContainer SDK only allows ONE boot() per page
// lifetime — so we must persist the instance outside module scope.

interface WCGlobal {
  __wc_instance?: WebContainer | null;
  __wc_booting?: Promise<WebContainer> | null;
  __wc_server_url?: string | null;
}

const _g = (typeof globalThis !== 'undefined' ? globalThis : window) as unknown as WCGlobal;

/**
 * Boot (or return cached) WebContainer instance.
 * Only one instance can exist per browser tab — the SDK throws if you
 * call boot() twice, even after teardown. We guard against that here.
 */
export async function getWebContainer(): Promise<WebContainer> {
  if (_g.__wc_instance) return _g.__wc_instance;
  if (_g.__wc_booting) return _g.__wc_booting;

  const { WebContainer: WC } = await import('@webcontainer/api');

  _g.__wc_booting = WC.boot({ coep: 'credentialless' })
    .then((wc) => {
      _g.__wc_instance = wc;
      _g.__wc_booting = null;
      return wc;
    })
    .catch((err) => {
      _g.__wc_booting = null;
      // If boot was already called (e.g. HMR reload or React strict mode),
      // the SDK throws "Only a single WebContainer instance can be booted".
      // Return the existing instance if we still have one.
      if (_g.__wc_instance) return _g.__wc_instance;
      throw err;
    });

  return _g.__wc_booting;
}

export function isWebContainerBooted(): boolean {
  return _g.__wc_instance != null;
}

/** Returns the cached dev server URL if the server is already running. */
export function getWebContainerServerUrl(): string | null {
  return _g.__wc_server_url ?? null;
}

/** Clear the cached server URL (call before Retry to force a fresh dev server start). */
export function clearWebContainerServerUrl(): void {
  _g.__wc_server_url = null;
}

/** Tear down the singleton. Only call on full page navigation. */
export async function teardownWebContainer(): Promise<void> {
  if (_g.__wc_instance) {
    _g.__wc_instance.teardown();
    _g.__wc_instance = null;
  }
  _g.__wc_booting = null;
}

// ── Browser Support Detection ──────────────────────────────────────────────

export function isWebContainerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  try {
    // SharedArrayBuffer is only available when COOP/COEP headers are set
    new SharedArrayBuffer(1);
    return true;
  } catch {
    return false;
  }
}

// ── File Format Conversion ─────────────────────────────────────────────────

/**
 * Convert BuildFlow's flat file array to WebContainer's nested FileSystemTree.
 *
 * Input:  [{ path: "app/page.tsx", content: "..." }]
 * Output: { app: { directory: { "page.tsx": { file: { contents: "..." } } } } }
 */
export function toFileSystemTree(files: WebContainerFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const { path, content } of files) {
    // Validate file has required properties
    if (!path || typeof path !== 'string') {
      console.warn('[WebContainer] Skipping file with invalid path:', path);
      continue;
    }
    
    if (content === null || content === undefined) {
      console.warn('[WebContainer] Skipping file with null/undefined content:', path);
      continue;
    }

    // Ensure content is a string
    const fileContent = typeof content === 'string' ? content : String(content);

    // Split path and filter out empty segments
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      console.warn('[WebContainer] Skipping file with empty path after processing:', path);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = tree;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      if (isLast) {
        // Create file entry
        current[segment] = { file: { contents: fileContent } };
      } else {
        // Create directory if doesn't exist
        if (!current[segment]) {
          current[segment] = { directory: {} };
        } else if (!current[segment].directory) {
          // Path conflict: segment exists as file but we need it as directory
          console.error('[WebContainer] Path conflict: cannot create directory, file exists at:', segments.slice(0, i + 1).join('/'));
          continue;
        }
        current = current[segment].directory;
      }
    }
  }

  return tree;
}

// ── Packages incompatible with WebContainers ─────────────────────────────

/** Packages that require native binaries or system-level access */
const INCOMPATIBLE_PACKAGES = [
  'prisma', '@prisma/client', '@auth/prisma-adapter',
  'bcrypt',          // native — bcryptjs (pure JS) is fine
  'sharp',           // native image processing
  'better-sqlite3',  // native SQLite
  'canvas',          // native canvas
  'fsevents',        // macOS file watching
];

function isIncompatible(pkg: string): boolean {
  return INCOMPATIBLE_PACKAGES.some((p) => pkg === p || pkg.startsWith(p + '/'));
}

// ── Auto-detect missing npm dependencies from import statements ────────────

/** Node.js built-in module names — skip these when scanning imports */
const NODE_BUILTINS = new Set([
  'fs', 'path', 'http', 'https', 'url', 'crypto', 'stream', 'util', 'events',
  'os', 'child_process', 'buffer', 'querystring', 'zlib', 'net', 'dns', 'tls',
  'cluster', 'worker_threads', 'readline', 'timers', 'assert', 'console',
  'process', 'module', 'vm', 'perf_hooks', 'async_hooks', 'string_decoder',
]);

/**
 * Well-known packages with their latest stable versions.
 * Used when the package isn't already in package.json — avoids resolving "latest"
 * at install time (unreliable in the WebContainer npm proxy).
 */
const KNOWN_VERSIONS: Record<string, string> = {
  'zustand': '^4.5.0',
  'jotai': '^2.7.0',
  'recoil': '^0.7.7',
  'framer-motion': '^11.0.0',
  'axios': '^1.6.0',
  'swr': '^2.2.0',
  '@tanstack/react-query': '^5.0.0',
  '@tanstack/react-table': '^8.0.0',
  'date-fns': '^3.3.0',
  'dayjs': '^1.11.0',
  'lodash': '^4.17.21',
  'lodash-es': '^4.17.21',
  'clsx': '^2.1.0',
  'class-variance-authority': '^0.7.0',
  'tailwind-merge': '^2.2.0',
  'react-hot-toast': '^2.4.0',
  'react-toastify': '^10.0.0',
  'sonner': '^1.4.0',
  'react-icons': '^5.0.0',
  'lucide-react': '^0.344.0',
  'react-hook-form': '^7.50.0',
  '@hookform/resolvers': '^3.3.0',
  'zod': '^3.22.0',
  'yup': '^1.3.0',
  'next-themes': '^0.3.0',
  'cmdk': '^1.0.0',
  'embla-carousel-react': '^8.0.0',
  'react-dropzone': '^14.2.0',
  'react-select': '^5.8.0',
  'react-datepicker': '^6.6.0',
  'recharts': '^2.12.0',
  'chart.js': '^4.4.0',
  'react-chartjs-2': '^5.2.0',
  'react-dnd': '^16.0.0',
  'react-dnd-html5-backend': '^16.0.0',
  '@dnd-kit/core': '^6.1.0',
  '@dnd-kit/sortable': '^8.0.0',
  'uuid': '^9.0.0',
  'nanoid': '^5.0.0',
  'stripe': '^14.0.0',
  '@stripe/stripe-js': '^3.0.0',
  '@stripe/react-stripe-js': '^2.0.0',
  'resend': '^3.0.0',
  'nodemailer': '^6.9.0',
  '@radix-ui/react-accordion': '^1.1.0',
  '@radix-ui/react-alert-dialog': '^1.0.0',
  '@radix-ui/react-avatar': '^1.0.0',
  '@radix-ui/react-badge': '^1.0.0',
  '@radix-ui/react-button': '^1.0.0',
  '@radix-ui/react-checkbox': '^1.0.0',
  '@radix-ui/react-collapsible': '^1.0.0',
  '@radix-ui/react-context-menu': '^2.1.0',
  '@radix-ui/react-dialog': '^1.0.0',
  '@radix-ui/react-dropdown-menu': '^2.0.0',
  '@radix-ui/react-hover-card': '^1.0.0',
  '@radix-ui/react-icons': '^1.3.0',
  '@radix-ui/react-label': '^2.0.0',
  '@radix-ui/react-menubar': '^1.0.0',
  '@radix-ui/react-navigation-menu': '^1.1.0',
  '@radix-ui/react-popover': '^1.0.0',
  '@radix-ui/react-progress': '^1.0.0',
  '@radix-ui/react-radio-group': '^1.1.0',
  '@radix-ui/react-scroll-area': '^1.0.0',
  '@radix-ui/react-select': '^2.0.0',
  '@radix-ui/react-separator': '^1.0.0',
  '@radix-ui/react-slider': '^1.1.0',
  '@radix-ui/react-slot': '^1.0.0',
  '@radix-ui/react-switch': '^1.0.0',
  '@radix-ui/react-tabs': '^1.0.0',
  '@radix-ui/react-toast': '^1.1.0',
  '@radix-ui/react-toggle': '^1.0.0',
  '@radix-ui/react-tooltip': '^1.0.0',
  'react-markdown': '^9.0.0',
  'remark-gfm': '^4.0.0',
  'highlight.js': '^11.9.0',
  'prismjs': '^1.29.0',
  'react-syntax-highlighter': '^15.5.0',
  '@supabase/supabase-js': '^2.39.0',
  '@supabase/auth-helpers-nextjs': '^0.10.0',
  'next-auth': '^4.24.0',
  'jose': '^5.2.0',
  'jsonwebtoken': '^9.0.0',
};

/**
 * Scan JS/TS file contents and return all third-party package names imported.
 * Skips relative paths, Node.js built-ins, Next.js internal paths, and `@/` aliases.
 */
function extractImportedPackages(content: string): string[] {
  const packages = new Set<string>();
  // Match: from 'pkg' / from "pkg" and require('pkg') / require("pkg")
  const re = /(?:from|require)\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const spec = m[1] ?? m[2];
    if (!spec) continue;
    // Skip relative, absolute, and internal alias imports
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/')) continue;
    // Extract bare package name (handle scoped packages)
    const pkgName = spec.startsWith('@')
      ? spec.split('/').slice(0, 2).join('/')
      : spec.split('/')[0];
    if (!pkgName || NODE_BUILTINS.has(pkgName)) continue;
    packages.add(pkgName);
  }
  return Array.from(packages);
}

function stripIncompatibleDeps(deps: Record<string, string>): { cleaned: Record<string, string>; removed: string[] } {
  const cleaned: Record<string, string> = {};
  const removed: string[] = [];
  for (const [key, value] of Object.entries(deps)) {
    if (isIncompatible(key)) {
      removed.push(key);
    } else {
      cleaned[key] = value;
    }
  }
  return { cleaned, removed };
}

// ── Ensure Required Config Files ───────────────────────────────────────────

const DEFAULT_TSCONFIG = JSON.stringify({
  compilerOptions: {
    target: 'es5',
    lib: ['dom', 'dom.iterable', 'esnext'],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: 'esnext',
    moduleResolution: 'bundler',
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: 'preserve',
    incremental: true,
    plugins: [{ name: 'next' }],
    paths: { '@/*': ['./*'] },
  },
  include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
  exclude: ['node_modules'],
}, null, 2);

const DEFAULT_NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
`;

/**
 * Mock Prisma client that returns empty results for all queries.
 * This lets generated code that imports from @/lib/prisma run without
 * a real database in the WebContainer sandbox.
 */
const MOCK_PRISMA = `// Mock Prisma client for WebContainer preview (no real database)
const handler = {
  get(_target, prop) {
    if (prop === 'then') return undefined; // not a thenable
    // Return a model proxy for any prisma.modelName access
    return new Proxy({}, {
      get(_t, method) {
        // All query methods return empty/zero results
        if (method === 'findMany') return async () => [];
        if (method === 'findFirst' || method === 'findUnique') return async () => null;
        if (method === 'count') return async () => 0;
        if (method === 'create' || method === 'update' || method === 'upsert') return async (args) => ({ id: 'mock-id', ...args?.data });
        if (method === 'createMany') return async () => ({ count: 0 });
        if (method === 'updateMany' || method === 'deleteMany') return async () => ({ count: 0 });
        if (method === 'delete') return async () => ({});
        if (method === 'aggregate') return async () => ({});
        if (method === 'groupBy') return async () => [];
        return async () => null;
      }
    });
  }
};
export const prisma = new Proxy({}, handler);
export default prisma;
`;

/**
 * Mock bcrypt/bcryptjs for WebContainer — just passes through.
 */
const MOCK_BCRYPT = `// Mock bcrypt for WebContainer preview
export async function hash(password) { return 'mock-hash-' + password; }
export async function compare(password, hash) { return true; }
export function hashSync(password) { return 'mock-hash-' + password; }
export function compareSync(password, hash) { return true; }
export default { hash, compare, hashSync, compareSync };
`;

/**
 * Ensure the file set includes package.json, tsconfig.json, etc.
 * Strips incompatible native dependencies and injects mocks so
 * the generated project can boot in WebContainers.
 */
export function ensureRequiredFiles(
  files: WebContainerFile[],
  dependencies: Record<string, string>,
  devDependencies?: Record<string, string>,
): WebContainerFile[] {
  const result = [...files];
  const paths = new Set(files.map((f) => f.path));

  // ── 1. Sanitize existing package.json if present ──────────────────────
  const pkgIdx = result.findIndex((f) => f.path === 'package.json');
  let hadPrisma = false;
  let allRemoved: string[] = [];

  if (pkgIdx !== -1) {
    try {
      const pkg = JSON.parse(result[pkgIdx].content);
      if (pkg.dependencies) {
        const { cleaned, removed } = stripIncompatibleDeps(pkg.dependencies);
        pkg.dependencies = cleaned;
        allRemoved.push(...removed);
      }
      if (pkg.devDependencies) {
        const { cleaned, removed } = stripIncompatibleDeps(pkg.devDependencies);
        pkg.devDependencies = cleaned;
        allRemoved.push(...removed);
      }
      // Strip --turbo flag: Turbopack can output startup messages in a format
      // that the WebContainer SDK's port-detection doesn't recognise, causing
      // the server-ready event to never fire.
      if (pkg.scripts?.dev) {
        pkg.scripts.dev = pkg.scripts.dev.replace(/\s*--turbo/g, '');
      }
      // Remove prisma-specific scripts
      if (pkg.scripts) {
        for (const key of Object.keys(pkg.scripts)) {
          if (key.startsWith('db:') || key.includes('prisma')) {
            delete pkg.scripts[key];
          }
        }
      }
      result[pkgIdx] = { path: 'package.json', content: JSON.stringify(pkg, null, 2) };
    } catch {
      // Malformed package.json — will be replaced below
      result.splice(pkgIdx, 1);
      paths.delete('package.json');
    }
  }

  // ── 2. Create package.json if missing ─────────────────────────────────
  if (!paths.has('package.json')) {
    const { cleaned: cleanDeps, removed: r1 } = stripIncompatibleDeps(dependencies);
    const { cleaned: cleanDevDeps, removed: r2 } = stripIncompatibleDeps(devDependencies || {});
    allRemoved.push(...r1, ...r2);

    const pkg = {
      name: 'buildflow-preview',
      version: '0.1.0',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: {
        next: '^14.0.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        ...cleanDeps,
      },
      devDependencies: {
        typescript: '^5',
        '@types/react': '^18',
        '@types/node': '^20',
        ...cleanDevDeps,
      },
    };
    result.push({ path: 'package.json', content: JSON.stringify(pkg, null, 2) });
  }

  hadPrisma = allRemoved.some((p) => p.includes('prisma'));

  // ── 2b. Auto-inject missing dependencies found in source files ────────
  // The AI often generates code that imports packages not listed in package.json
  // (e.g. zustand, framer-motion, recharts). Scan all JS/TS files, find any
  // undeclared packages, and add them before npm install runs.
  {
    const pkgFileIdx = result.findIndex((f) => f.path === 'package.json');
    if (pkgFileIdx !== -1) {
      try {
        const pkg = JSON.parse(result[pkgFileIdx].content);
        const declared = new Set([
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ]);
        const missing: Record<string, string> = {};

        for (const f of result) {
          if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f.path)) continue;
          for (const pkgName of extractImportedPackages(f.content)) {
            if (!declared.has(pkgName) && !isIncompatible(pkgName) && !missing[pkgName]) {
              missing[pkgName] = KNOWN_VERSIONS[pkgName] ?? 'latest';
            }
          }
        }

        if (Object.keys(missing).length > 0) {
          pkg.dependencies = { ...(pkg.dependencies ?? {}), ...missing };
          result[pkgFileIdx] = { path: 'package.json', content: JSON.stringify(pkg, null, 2) };
          console.log('[WebContainer] Auto-added missing deps:', Object.keys(missing).join(', '));
        }
      } catch {
        // package.json parse failed — skip auto-detect
      }
    }
  }

  // ── 2c. Patch lib/supabase.ts to not throw on missing env vars ────────
  // Generated Supabase clients call `throw new Error('Missing ...')` at module
  // load time if the env vars aren't set — crashing the entire Next.js boot.
  // Replace with graceful fallbacks so the app can render without real Supabase.
  for (let i = 0; i < result.length; i++) {
    const f = result[i];
    if (
      (f.path === 'lib/supabase.ts' || f.path === 'lib/supabase.js' ||
       f.path === 'src/lib/supabase.ts' || f.path === 'src/lib/supabase.js') &&
      f.content.includes('createClient') &&
      (f.content.includes('throw new Error') || f.content.includes('Missing '))
    ) {
      // Replace the whole file with a no-op Supabase stub
      result[i] = {
        ...f,
        content: `// WebContainer preview — Supabase stub (no real credentials)
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';
export const supabase = createClient(url, key);
export default supabase;
`,
      };
      console.log('[WebContainer] Replaced lib/supabase with stub (no throw on missing env)');
    }
  }

  // ── 3. Inject mocks for stripped packages ───────────────────────────
  if (hadPrisma) {
    // Replace the real lib/prisma.ts with a mock
    const prismaPath = files.find((f) =>
      f.path === 'lib/prisma.ts' || f.path === 'lib/prisma.js' ||
      f.path === 'src/lib/prisma.ts' || f.path === 'src/lib/prisma.js'
    )?.path || 'lib/prisma.ts';

    const existingIdx = result.findIndex((f) => f.path === prismaPath);
    if (existingIdx !== -1) {
      result[existingIdx] = { path: prismaPath, content: MOCK_PRISMA };
    } else {
      result.push({ path: prismaPath, content: MOCK_PRISMA });
    }

    // Patch any file that imports PrismaAdapter — remove the import and adapter usage
    for (let i = 0; i < result.length; i++) {
      const f = result[i];
      if (f.content.includes('@auth/prisma-adapter') || f.content.includes('PrismaAdapter')) {
        let patched = f.content;
        // Remove import line
        patched = patched.replace(/import\s*\{[^}]*PrismaAdapter[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?\n?/g, '');
        // Remove adapter: PrismaAdapter(...) line
        patched = patched.replace(/\s*adapter:\s*PrismaAdapter\([^)]*\)\s*(?:as\s+any)?\s*,?/g, '');
        result[i] = { ...f, content: patched };
      }
      // Also remove direct @prisma/client imports (enums, types)
      if (f.content.includes("from '@prisma/client'") || f.content.includes('from "@prisma/client"')) {
        let patched = f.content;
        // Replace Prisma enum imports with local string literal types
        patched = patched.replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]@prisma\/client['"]\s*;?\n?/g,
          (_match, imports: string) => {
            // Create string literal type declarations for each imported enum
            const names = imports.split(',').map((s: string) => s.trim()).filter(Boolean);
            return names.map((n: string) => `type ${n} = string;`).join('\n') + '\n';
          }
        );
        result[i] = { ...f, content: patched };
      }
    }

    console.warn(`[WebContainer] Stripped: ${allRemoved.join(', ')} — injected Prisma mocks`);
  }

  // ── 4. Inject bcrypt mock if native bcrypt was stripped ───────────────
  const hadBcrypt = allRemoved.includes('bcrypt');
  if (hadBcrypt) {
    const mockPath = 'lib/bcrypt-mock.ts';
    result.push({ path: mockPath, content: MOCK_BCRYPT });
    // Redirect any `import ... from 'bcrypt'` to the mock
    for (let i = 0; i < result.length; i++) {
      const f = result[i];
      if (f.content.includes("from 'bcrypt'") || f.content.includes('from "bcrypt"')) {
        result[i] = {
          ...f,
          content: f.content
            .replace(/from\s+['"]bcrypt['"]/g, "from '@/lib/bcrypt-mock'"),
        };
      }
    }
    console.warn('[WebContainer] bcrypt stripped — injected pure-JS mock');
  }

  if (allRemoved.length > 0 && !hadPrisma && !hadBcrypt) {
    console.warn(`[WebContainer] Stripped incompatible packages: ${allRemoved.join(', ')}`);
  }

  // ── 5. Ensure .npmrc (disable postinstall scripts & native binary downloads) ──
  if (!paths.has('.npmrc')) {
    result.push({
      path: '.npmrc',
      content: [
        'ignore-scripts=true',
        'legacy-peer-deps=true',
      ].join('\n') + '\n',
    });
  }

  // ── 5b. Inject .env.local with stub values so the app doesn't crash on boot ──
  // Generated fullstack apps crash silently when NEXTAUTH_SECRET, DATABASE_URL
  // etc. are undefined (e.g. string.split() on undefined). Mock values let the
  // app boot and render — actual data comes from the Prisma mock above.
  if (!paths.has('.env.local') && !paths.has('.env')) {
    result.push({
      path: '.env.local',
      content: [
        '# Stub env vars for WebContainer preview — not real credentials',
        'NEXTAUTH_SECRET=webcontainer-preview-secret-not-real',
        'NEXTAUTH_URL=http://localhost:3000',
        'DATABASE_URL=postgresql://mock:mock@localhost:5432/mockdb',
        'DIRECT_URL=postgresql://mock:mock@localhost:5432/mockdb',
        'NEXT_PUBLIC_APP_URL=http://localhost:3000',
        'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
        'ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000001',
        'NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key',
        'SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder',
        'STRIPE_SECRET_KEY=sk_test_placeholder',
        'RESEND_API_KEY=re_placeholder',
      ].join('\n') + '\n',
    });
  }

  // ── 5c. Neutralize lib/auth.ts if it uses PrismaAdapter (already stripped) ──
  // After PrismaAdapter is removed, the NextAuth config may still export authOptions
  // that reference it. Patch any `lib/auth.ts` or `app/api/auth/[...nextauth]/route.ts`
  // that export authOptions with a minimal working config so next-auth doesn't crash.
  for (let i = 0; i < result.length; i++) {
    const f = result[i];
    // Only patch files that had the adapter removed but still export authOptions
    if (
      (f.path === 'lib/auth.ts' || f.path === 'lib/auth.js' ||
       f.path === 'src/lib/auth.ts' || f.path === 'src/lib/auth.js') &&
      !f.content.includes('PrismaAdapter') && // adapter was already stripped
      (f.content.includes('authOptions') || f.content.includes('NextAuth'))
    ) {
      // Ensure NEXTAUTH_SECRET won't throw (some configs do process.env.X!)
      let patched = f.content;
      // Replace `process.env.NEXTAUTH_SECRET!` (non-null assertion that crashes if undefined)
      patched = patched.replace(
        /process\.env\.NEXTAUTH_SECRET!/g,
        "process.env.NEXTAUTH_SECRET ?? 'preview-secret'"
      );
      if (patched !== f.content) {
        result[i] = { ...f, content: patched };
      }
    }
  }

  // ── 5e. Neutralize middleware.ts so auth guards don't redirect every page ──
  // In a real deployed app the middleware protects routes. In the WebContainer
  // sandbox there's no session, so all pages would redirect to /login and the
  // preview would show blank. Replace with a no-op pass-through.
  const middlewareIdx = result.findIndex(
    (f) => f.path === 'middleware.ts' || f.path === 'middleware.js' ||
            f.path === 'src/middleware.ts' || f.path === 'src/middleware.js',
  );
  const PASSTHROUGH_MIDDLEWARE = `// WebContainer preview — pass-through middleware (no auth guards)
export function middleware() {}
export const config = { matcher: [] };
`;
  if (middlewareIdx !== -1) {
    result[middlewareIdx] = { ...result[middlewareIdx], content: PASSTHROUGH_MIDDLEWARE };
    console.log('[WebContainer] Replaced middleware with pass-through for preview');
  }

  // ── 6. Ensure tsconfig.json ───────────────────────────────────────────
  if (!paths.has('tsconfig.json')) {
    result.push({ path: 'tsconfig.json', content: DEFAULT_TSCONFIG });
  }

  // ── 7. Ensure next.config ─────────────────────────────────────────────
  if (!paths.has('next.config.js') && !paths.has('next.config.ts') && !paths.has('next.config.mjs')) {
    result.push({ path: 'next.config.js', content: DEFAULT_NEXT_CONFIG });
  }

  // ── 8. Strip Prisma schema file (causes postinstall errors) ───────────
  const prismaSchemaIdx = result.findIndex((f) =>
    f.path === 'prisma/schema.prisma' || f.path.endsWith('/schema.prisma')
  );
  if (prismaSchemaIdx !== -1) {
    result.splice(prismaSchemaIdx, 1);
  }

  return result;
}

// ── Process Helpers ────────────────────────────────────────────────────────

/** Run `npm install` and stream output. Returns exit code. */
export async function runNpmInstall(
  wc: WebContainer,
  onOutput: OutputCallback,
  timeoutMs: number = 120_000,
): Promise<number> {
  onOutput('\x1b[36m$ npm install\x1b[0m\r\n');
  // --ignore-scripts: prevents postinstall hooks that download native binaries
  //   (e.g. @next/swc-*, esbuild, lightningcss) from running and failing in the
  //   browser sandbox. Next.js falls back to Babel compilation without SWC.
  // --legacy-peer-deps: avoids peer dep conflicts in generated project manifests.
  const proc = await wc.spawn('npm', ['install', '--legacy-peer-deps', '--ignore-scripts']);

  proc.output.pipeTo(
    new WritableStream({ write(data) { onOutput(data); } }),
  );

  // Race between exit and timeout
  const exitCode = await Promise.race([
    proc.exit,
    new Promise<number>((resolve) =>
      setTimeout(() => {
        onOutput('\r\n\x1b[33m⚠ npm install timed out — killing process\x1b[0m\r\n');
        proc.kill();
        resolve(1);
      }, timeoutMs)
    ),
  ]);

  return exitCode;
}

/** Run `npm run dev` and stream output. Fires onServerReady when the dev server is listening.
 *
 * If the dev server is already running from a previous component mount (e.g. user toggled
 * to static preview and back), we skip spawning a second process — port 3000 would conflict —
 * and immediately fire onServerReady with the cached URL instead.
 *
 * Returns a reject promise if the server doesn't become ready within `timeoutMs`.
 */
export async function runDevServer(
  wc: WebContainer,
  onOutput: OutputCallback,
  onServerReady: ServerReadyCallback,
  timeoutMs: number = 180_000,
): Promise<void> {
  // Short-circuit: server already running from a previous mount
  if (_g.__wc_server_url) {
    onOutput('\x1b[90mDev server already running — reconnecting.\x1b[0m\r\n');
    onServerReady(3000, _g.__wc_server_url);
    return;
  }

  onOutput('\r\n\x1b[36m$ npm run dev\x1b[0m\r\n');
  const proc = await wc.spawn('npm', ['run', 'dev']);

  proc.output.pipeTo(
    new WritableStream({ write(data) { onOutput(data); } }),
  );

  // Race: server-ready event vs timeout
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Dev server did not start within 3 minutes. Check the terminal for errors.'));
    }, timeoutMs);

    wc.on('server-ready', (port, url) => {
      clearTimeout(timer);
      _g.__wc_server_url = url;
      onServerReady(port, url);
      resolve();
    });
  });
}
