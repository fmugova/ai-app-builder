'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface WebContainerPreviewProps {
  files: Array<{ path: string; content: string; language?: string }>;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  projectType: string;
  onFallback?: () => void;
}

type BootPhase =
  | 'idle'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const PHASE_LABELS: Record<BootPhase, string> = {
  idle: 'Initializing...',
  booting: 'Starting WebContainer...',
  mounting: 'Loading project files...',
  installing: 'Installing dependencies...',
  starting: 'Starting dev server...',
  ready: 'Live Preview',
  error: 'Error',
};

const PHASE_COLORS: Record<BootPhase, string> = {
  idle: 'text-gray-400',
  booting: 'text-blue-500',
  mounting: 'text-blue-500',
  installing: 'text-amber-500',
  starting: 'text-amber-500',
  ready: 'text-green-500',
  error: 'text-red-500',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function WebContainerPreview({
  files,
  dependencies,
  devDependencies,
  // projectType reserved for future framework-specific handling
  onFallback,
}: WebContainerPreviewProps) {
  const [phase, setPhase] = useState<BootPhase>('idle');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const terminalRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cancelledRef = useRef(false);
  const prevDepsHash = useRef('');

  // Hash dependencies to detect changes
  const depsHash = useMemo(
    () => JSON.stringify(dependencies),
    [dependencies],
  );

  // Append text to the terminal log
  const appendTerminal = useCallback((data: string) => {
    setTerminalLines((prev) => {
      // Split by newlines and append, cap at 500 lines
      const lines = data.split(/\r?\n/);
      const next = [...prev];
      for (const line of lines) {
        if (line) next.push(line);
      }
      return next.slice(-500);
    });
  }, []);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [terminalLines]);

  // Collapse terminal when server is ready
  useEffect(() => {
    if (phase === 'ready') setTerminalOpen(false);
    if (phase === 'installing' || phase === 'starting') setTerminalOpen(true);
  }, [phase]);

  // ── Main boot/mount/install/start lifecycle ────────────────────────────

  useEffect(() => {
    cancelledRef.current = false;

    async function boot() {
      try {
        // Check browser support
        const { isWebContainerSupported } = await import('@/lib/webcontainer');
        if (!isWebContainerSupported()) {
          appendTerminal('\x1b[31mWebContainers not supported in this browser.\x1b[0m');
          appendTerminal('Requires SharedArrayBuffer (Chrome 90+, Firefox 89+, Safari 16.4+)');
          setPhase('error');
          setErrorMsg('WebContainers not supported in this browser. Falling back to static preview.');
          onFallback?.();
          return;
        }

        // 1. Boot
        setPhase('booting');
        appendTerminal('\x1b[90mBooting WebContainer...\x1b[0m');
        const {
          getWebContainer, toFileSystemTree, ensureRequiredFiles,
          runNpmInstall, runDevServer, getWebContainerServerUrl,
        } = await import('@/lib/webcontainer');

        const wc = await getWebContainer();
        if (cancelledRef.current) return;
        appendTerminal('\x1b[32mWebContainer booted.\x1b[0m');

        // 2. Mount files
        setPhase('mounting');
        appendTerminal(`\x1b[90mMounting ${files.length} project files...\x1b[0m`);
        const allFiles = ensureRequiredFiles(files, dependencies, devDependencies);
        
        // Validate files before creating tree
        const validFiles = allFiles.filter(f => {
          if (!f.path || typeof f.path !== 'string') {
            console.warn(`[WebContainer] Skipping invalid file: missing or invalid path`, f);
            return false;
          }
          if (f.content === undefined || f.content === null) {
            console.warn(`[WebContainer] Skipping file with no content: ${f.path}`);
            return false;
          }
          // Ensure content is a string
          if (typeof f.content !== 'string') {
            console.warn(`[WebContainer] Converting ${f.path} content to string`);
            f.content = String(f.content);
          }
          return true;
        });
        
        if (validFiles.length === 0) {
          throw new Error('No valid files to mount - all files failed validation');
        }
        
        if (validFiles.length < allFiles.length) {
          appendTerminal(`\x1b[33m⚠ Skipped ${allFiles.length - validFiles.length} invalid file(s)\x1b[0m`);
        }
        
        const tree = toFileSystemTree(validFiles);
        
        // Validate tree is not empty
        if (Object.keys(tree).length === 0) {
          throw new Error('File system tree is empty - no valid files to mount');
        }
        
        console.log('[WebContainer] Mounting file tree:', Object.keys(tree));
        console.log('[WebContainer] File count:', { total: allFiles.length, valid: validFiles.length, tree: Object.keys(tree).length });
        
        try {
          await wc.mount(tree);
        } catch (mountError) {
          const err = mountError as Error;
          console.error('[WebContainer] Mount failed:', err);
          console.error('[WebContainer] Tree structure:', JSON.stringify(tree, null, 2).slice(0, 500));
          // Log first few files for debugging
          const sampleFiles = validFiles.slice(0, 3).map(f => ({
            path: f.path,
            contentLength: f.content?.length || 0,
            contentType: typeof f.content
          }));
          console.error('[WebContainer] Sample files:', sampleFiles);
          throw new Error(`Failed to mount files: ${err.message}`);
        }
        
        if (cancelledRef.current) return;
        appendTerminal(`\x1b[32m${validFiles.length} files mounted successfully.\x1b[0m\r\n`);

        // 3. npm install — skip if deps unchanged AND dev server already running
        // (handles the case where user toggled to static preview and back)
        const serverAlreadyRunning = !!getWebContainerServerUrl();
        const needsInstall = !serverAlreadyRunning || prevDepsHash.current !== depsHash;
        prevDepsHash.current = depsHash;

        if (needsInstall) {
          setPhase('installing');
          const exitCode = await runNpmInstall(wc, appendTerminal);
          if (cancelledRef.current) return;

          if (exitCode !== 0) {
            // Non-zero exit often means an optional package (e.g. @next/swc-* native
            // binary) failed to resolve — not fatal. Next.js falls back to Babel.
            appendTerminal(`\r\n\x1b[33m⚠ npm install exited ${exitCode} (optional deps may have failed — continuing)\x1b[0m\r\n`);
          } else {
            appendTerminal('\r\n\x1b[32mDependencies installed.\x1b[0m\r\n');
          }
        } else {
          appendTerminal('\x1b[90mDependencies unchanged — skipping install.\x1b[0m\r\n');
        }

        // 4. Start dev server
        setPhase('starting');
        await runDevServer(wc, appendTerminal, (port, url) => {
          if (!cancelledRef.current) {
            appendTerminal(`\r\n\x1b[32mDev server ready on port ${port}\x1b[0m`);
            setServerUrl(url);
            setPhase('ready');
          }
        });
      } catch (err) {
        if (cancelledRef.current) return;
        const msg = err instanceof Error ? err.message : 'WebContainer failed to boot';
        console.error('WebContainer error:', err);
        appendTerminal(`\r\n\x1b[31mError: ${msg}\x1b[0m`);
        setPhase('error');
        setErrorMsg(msg);
      }
    }

    boot();

    return () => {
      cancelledRef.current = true;
    };
    // retryCount triggers a re-boot when user clicks Retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // Re-mount files when they change (but don't reboot)
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'starting') return;

    async function remount() {
      try {
        const { getWebContainer, toFileSystemTree, ensureRequiredFiles, isWebContainerBooted } =
          await import('@/lib/webcontainer');
        if (!isWebContainerBooted()) return;

        const wc = await getWebContainer();
        const allFiles = ensureRequiredFiles(files, dependencies, devDependencies);
        
        // Validate files before remounting (same as initial mount)
        const validFiles = allFiles.filter(f => {
          if (!f.path || typeof f.path !== 'string' || !f.content) {
            console.warn(`[WebContainer Remount] Skipping invalid file:`, f.path || 'unknown');
            return false;
          }
          if (typeof f.content !== 'string') {
            f.content = String(f.content);
          }
          return true;
        });
        
        if (validFiles.length === 0) {
          console.warn('[WebContainer] Remount skipped - no valid files');
          appendTerminal('\x1b[33m⚠ File update skipped - no valid files\x1b[0m');
          return;
        }
        
        const tree = toFileSystemTree(validFiles);
        
        // Validate tree before remounting
        if (Object.keys(tree).length === 0) {
          console.warn('[WebContainer] Skipping remount - tree is empty');
          return;
        }
        
        await wc.mount(tree);
        appendTerminal(`\x1b[90mFiles updated (${validFiles.length} files) — HMR should pick up changes.\x1b[0m`);
      } catch (err) {
        console.error('File remount error:', err);
        appendTerminal(`\x1b[31mFile update failed: ${err instanceof Error ? err.message : 'Unknown error'}\x1b[0m`);
      }
    }

    remount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Note: We intentionally do NOT teardown the WebContainer on unmount.
  // The SDK only allows one boot() per page lifetime, and React strict mode
  // double-mounts components. The singleton persists at module scope and is
  // reused if the user navigates back to chatbuilder.

  // ── Render ─────────────────────────────────────────────────────────────

  const isLoading = phase !== 'ready' && phase !== 'error';
  const showIframe = phase === 'ready' && serverUrl;

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-950">
      {/* ── Status Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : phase === 'ready' ? (
            <Zap className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-medium ${PHASE_COLORS[phase]}`}>
            {PHASE_LABELS[phase]}
          </span>
          {phase === 'ready' && serverUrl && (
            <span className="text-xs text-gray-500 ml-2 font-mono">{serverUrl}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Viewport toggles (only when ready) */}
          {phase === 'ready' && (
            <>
              {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((vp) => {
                const Icon = vp === 'desktop' ? Monitor : vp === 'tablet' ? Tablet : Smartphone;
                return (
                  <button
                    key={vp}
                    onClick={() => setViewport(vp)}
                    title={vp.charAt(0).toUpperCase() + vp.slice(1)}
                    className={`p-1.5 rounded text-xs transition-colors ${
                      viewport === vp
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
              <div className="w-px h-4 bg-gray-700 mx-1" />
            </>
          )}

          {/* Refresh button */}
          {phase === 'ready' && (
            <button
              onClick={() => {
                if (iframeRef.current && serverUrl) {
                  iframeRef.current.src = serverUrl;
                }
              }}
              title="Refresh preview"
              className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Terminal toggle */}
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            title={terminalOpen ? 'Collapse terminal' : 'Expand terminal'}
            className="flex items-center gap-1 p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            {terminalOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* ── Main Area (iframe + loading state) ────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-300 text-sm font-medium">{PHASE_LABELS[phase]}</p>
            <p className="text-gray-500 text-xs mt-1">
              {phase === 'installing'
                ? 'This may take 15-30 seconds...'
                : 'Setting up your project...'}
            </p>
          </div>
        )}

        {/* Error overlay */}
        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-4" />
            <p className="text-red-300 text-sm font-medium mb-2">Preview Error</p>
            <p className="text-gray-400 text-xs max-w-md text-center mb-4">{errorMsg}</p>
            <button
              onClick={() => {
                // Clear cached server URL so the retry spawns a fresh dev server
                import('@/lib/webcontainer').then(({ clearWebContainerServerUrl }) => {
                  clearWebContainerServerUrl();
                });
                setPhase('idle');
                setErrorMsg('');
                setTerminalLines([]);
                setRetryCount((c) => c + 1);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Live iframe */}
        {showIframe && (
          <div
            className={`h-full ${viewport === 'desktop' ? '' : 'flex justify-center overflow-auto py-2'}`}
          >
            <div
              className={viewport === 'desktop' ? 'w-full h-full' : 'relative bg-white shadow-lg flex-shrink-0'}
              style={
                viewport !== 'desktop'
                  ? { width: VIEWPORT_WIDTHS[viewport], height: '100%', minHeight: '500px' }
                  : undefined
              }
            >
              <iframe
                ref={iframeRef}
                title="Live Preview"
                src={serverUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Terminal Panel ─────────────────────────────────────────── */}
      <div
        className={`border-t border-gray-800 bg-gray-900 transition-all duration-200 ${
          terminalOpen ? 'h-48' : 'h-8'
        }`}
      >
        {/* Terminal header bar */}
        <button
          onClick={() => setTerminalOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <TerminalIcon className="w-3 h-3" />
            Terminal
            {terminalLines.length > 0 && (
              <span className="text-gray-600">({terminalLines.length} lines)</span>
            )}
          </span>
          {terminalOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {/* Terminal output */}
        {terminalOpen && (
          <div
            ref={terminalRef}
            className="h-[calc(100%-28px)] overflow-auto px-3 pb-2 font-mono text-xs leading-relaxed text-gray-300"
          >
            {terminalLines.map((line, i) => (
              <div
                key={i}
                dangerouslySetInnerHTML={{
                  __html: ansiToHtml(line),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ANSI → HTML (minimal, handles colors we emit) ──────────────────────────

function ansiToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\x1b\[1m/g, '<strong>')
    .replace(/\x1b\[22m/g, '</strong>')
    // Colors
    .replace(/\x1b\[31m/g, '<span style="color:#f87171">') // red
    .replace(/\x1b\[32m/g, '<span style="color:#4ade80">') // green
    .replace(/\x1b\[33m/g, '<span style="color:#facc15">') // yellow
    .replace(/\x1b\[36m/g, '<span style="color:#22d3ee">') // cyan
    .replace(/\x1b\[90m/g, '<span style="color:#6b7280">') // gray
    // Reset
    .replace(/\x1b\[0m/g, '</span>')
    // Strip any remaining ANSI codes
    .replace(/\x1b\[\d{1,3}(;\d{1,3})*m/g, '');
}
