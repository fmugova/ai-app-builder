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
      // Ensure dev script uses --turbo for faster starts
      if (pkg.scripts?.dev && !pkg.scripts.dev.includes('--turbo')) {
        pkg.scripts.dev = pkg.scripts.dev.replace('next dev', 'next dev --turbo');
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
      scripts: { dev: 'next dev --turbo', build: 'next build', start: 'next start' },
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

    console.warn(`[WebContainer] Stripped: ${allRemoved.join(', ')} — injected mocks`);
  }

  if (allRemoved.length > 0 && !hadPrisma) {
    console.warn(`[WebContainer] Stripped incompatible packages: ${allRemoved.join(', ')}`);
  }

  // ── 5. Ensure tsconfig.json ───────────────────────────────────────────
  if (!paths.has('tsconfig.json')) {
    result.push({ path: 'tsconfig.json', content: DEFAULT_TSCONFIG });
  }

  // ── 6. Ensure next.config ─────────────────────────────────────────────
  if (!paths.has('next.config.js') && !paths.has('next.config.ts') && !paths.has('next.config.mjs')) {
    result.push({ path: 'next.config.js', content: DEFAULT_NEXT_CONFIG });
  }

  // ── 7. Strip Prisma schema file (causes postinstall errors) ───────────
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
  const proc = await wc.spawn('npm', ['install', '--prefer-offline', '--legacy-peer-deps']);

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

/** Run `npm run dev` and stream output. Fires onServerReady when the dev server is listening. */
export async function runDevServer(
  wc: WebContainer,
  onOutput: OutputCallback,
  onServerReady: ServerReadyCallback,
): Promise<void> {
  onOutput('\r\n\x1b[36m$ npm run dev\x1b[0m\r\n');
  const process = await wc.spawn('npm', ['run', 'dev']);

  process.output.pipeTo(
    new WritableStream({ write(data) { onOutput(data); } }),
  );

  wc.on('server-ready', (port, url) => {
    onServerReady(port, url);
  });
}
