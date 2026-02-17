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

let _instance: WebContainer | null = null;
let _booting: Promise<WebContainer> | null = null;

/**
 * Boot (or return cached) WebContainer instance.
 * Only one instance can exist per browser tab.
 */
export async function getWebContainer(): Promise<WebContainer> {
  if (_instance) return _instance;
  if (_booting) return _booting;

  const { WebContainer: WC } = await import('@webcontainer/api');

  _booting = WC.boot({ coep: 'credentialless' }).then((wc) => {
    _instance = wc;
    _booting = null;
    return wc;
  });

  return _booting;
}

export function isWebContainerBooted(): boolean {
  return _instance !== null;
}

/** Tear down the singleton — call on page unmount. */
export async function teardownWebContainer(): Promise<void> {
  if (_instance) {
    _instance.teardown();
    _instance = null;
  }
  _booting = null;
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
    const segments = path.split('/').filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = tree;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      if (isLast) {
        current[segment] = { file: { contents: content } };
      } else {
        if (!current[segment]) {
          current[segment] = { directory: {} };
        }
        current = current[segment].directory;
      }
    }
  }

  return tree;
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
 * Ensure the file set includes package.json, tsconfig.json, etc.
 * Synthesises missing config files from dependencies.
 */
export function ensureRequiredFiles(
  files: WebContainerFile[],
  dependencies: Record<string, string>,
  devDependencies?: Record<string, string>,
): WebContainerFile[] {
  const paths = new Set(files.map((f) => f.path));
  const result = [...files];

  // Strip Prisma (needs native binaries that don't work in WebContainers)
  const cleanDeps = { ...dependencies };
  const cleanDevDeps = { ...(devDependencies || {}) };
  let hadPrisma = false;

  for (const key of Object.keys(cleanDeps)) {
    if (key.includes('prisma')) {
      delete cleanDeps[key];
      hadPrisma = true;
    }
  }
  for (const key of Object.keys(cleanDevDeps)) {
    if (key.includes('prisma')) {
      delete cleanDevDeps[key];
      hadPrisma = true;
    }
  }

  if (hadPrisma) {
    console.warn('⚠️ Prisma removed from WebContainer dependencies (native binaries not supported)');
  }

  // package.json
  if (!paths.has('package.json')) {
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

  // tsconfig.json
  if (!paths.has('tsconfig.json')) {
    result.push({ path: 'tsconfig.json', content: DEFAULT_TSCONFIG });
  }

  // next.config.js / next.config.ts
  if (!paths.has('next.config.js') && !paths.has('next.config.ts') && !paths.has('next.config.mjs')) {
    result.push({ path: 'next.config.js', content: DEFAULT_NEXT_CONFIG });
  }

  return result;
}

// ── Process Helpers ────────────────────────────────────────────────────────

/** Run `npm install` and stream output. Returns exit code. */
export async function runNpmInstall(
  wc: WebContainer,
  onOutput: OutputCallback,
): Promise<number> {
  onOutput('\x1b[36m$ npm install\x1b[0m\r\n');
  const process = await wc.spawn('npm', ['install', '--prefer-offline']);

  process.output.pipeTo(
    new WritableStream({ write(data) { onOutput(data); } }),
  );

  return process.exit;
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
