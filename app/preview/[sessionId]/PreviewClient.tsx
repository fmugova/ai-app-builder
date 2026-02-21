'use client';

import { useMemo, useState, useEffect } from 'react';
import { FileText, ChevronRight, Home, ExternalLink, AlertCircle, Download } from 'lucide-react';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  isHomepage: boolean;
  order: number;
}

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string | null;
}

interface PreviewClientProps {
  code: string;
  projectName: string;
  pages?: Page[];
  files?: ProjectFile[];
  isMultiPage?: boolean;
}

export default function PreviewClient({ 
  code, 
  projectName, 
  pages = [], 
  files = [],
  isMultiPage = false 
}: PreviewClientProps) {
  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Always default to homepage when pages exist — regardless of isMultiPage flag,
    // which can be false even when Page records exist due to DB inconsistencies.
    if (pages.length > 0) {
      const home = pages.find(p => p.isHomepage);
      return home?.slug || pages[0].slug;
    }
    return 'main';
  });
  const [showNav, setShowNav] = useState(true);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoadingStackBlitz, setIsLoadingStackBlitz] = useState(false);

  // Get HTML files from project files
  const htmlFiles = useMemo(() => {
    return files.filter(f => f.path.endsWith('.html') || f.path.endsWith('.htm'));
  }, [files]);

  // Determine if we have multiple pages to show
  const hasMultiplePages = pages.length > 0 || htmlFiles.length > 1;

  // Get current content to display
  const currentContent = useMemo(() => {
    try {
      if (currentPage === 'main') {
        return sanitizeCode(code);
      }

      // Check if it's a page
      const page = pages.find(p => p.slug === currentPage);
      if (page) {
        return sanitizeCode(page.content);
      }

      // Check if it's a file
      const file = htmlFiles.find(f => f.path === currentPage);
      if (file) {
        return sanitizeCode(file.content);
      }

      return sanitizeCode(code);
    } catch (error) {
      console.error('Error preparing content:', error);
      setIframeError(error instanceof Error ? error.message : 'Unknown error');
      return createErrorPage('Failed to prepare content for preview');
    }
  }, [currentPage, code, pages, htmlFiles]);

  // Monitor iframe messages: errors + in-app navigation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'iframe-error') {
        setIframeError(event.data.message);
      }

      // Intercept in-app link clicks posted from the injected nav interceptor
      if (event.data?.type === 'navigate') {
        const href = (event.data.href as string) || '';
        // Normalise href → slug: /auth/login → auth-login, / → home
        const raw = href.replace(/^\/+/, '').replace(/\/+$/, '');
        const hyphenated = raw.replace(/\//g, '-');

        const match =
          pages.find(p => p.slug === raw) ||
          pages.find(p => p.slug === hyphenated) ||
          pages.find(p => '/' + p.slug === href) ||
          (raw === '' ? pages.find(p => p.isHomepage) : undefined);

        if (match) {
          setCurrentPage(match.slug);
          setIframeError(null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // pages is a stable server-rendered prop — no need to re-register on change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log preview info on mount
  useEffect(() => {
    console.log('🎨 Preview Client Initialized:', {
      projectName,
      codeLength: code.length,
      pagesCount: pages.length,
      filesCount: files.length,
      isMultiPage,
      hasMultiplePages,
      currentPage
    });
  }, []);

  // Create error page
  function createErrorPage(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f3f4f6;
    }
    .error-container {
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 500px;
      text-align: center;
    }
    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 { color: #dc2626; margin: 0 0 0.5rem; }
    p { color: #6b7280; }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1>Preview Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }

  // Sanitize and prepare code for iframe
  function sanitizeCode(rawCode: string): string {
    if (!rawCode || rawCode.trim().length === 0) {
      console.warn('⚠️ Empty code provided to sanitizeCode');
      return createErrorPage('No content available');
    }

    let sanitized = rawCode.trim();

    // Detect raw JSON (fullstack project — server-side code, can't render as HTML)
    if (sanitized.startsWith('{') && (sanitized.includes('"projectType"') || sanitized.includes('"files"'))) {
      return createErrorPage(
        'This project generates server-side code and cannot be previewed as static HTML. ' +
        'Use the Fast Preview (WebContainer) or deploy to Vercel for a live preview.'
      );
    }

    // Unescape JSON-encoded sequences stored literally in the DB
    // (happens when AI output is extracted without JSON.parse — \n stays as two chars)
    if (sanitized.includes('\\n') || sanitized.includes('\\t')) {
      sanitized = sanitized
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
    }

    // Ensure DOCTYPE exists
    if (!sanitized.startsWith('<!DOCTYPE')) {
      sanitized = `<!DOCTYPE html>\n${sanitized}`;
    }

    // Ensure basic HTML structure
    if (!sanitized.includes('<html')) {
      console.warn('⚠️ Missing <html> tag, wrapping content');
      sanitized = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
${sanitized.replace('<!DOCTYPE html>', '').trim()}
</body>
</html>`;
    }

    // Check if Tailwind CDN is needed and missing
    const hasTailwindClasses = /class="[^"]*(?:flex|grid|p-|m-|text-|bg-|border|rounded|shadow|w-|h-)/i.test(sanitized);
    const hasTailwindCDN = sanitized.includes('tailwindcss.com') || sanitized.includes('tailwind.min.js');

    if (hasTailwindClasses && !hasTailwindCDN) {
      const headEndIndex = sanitized.indexOf('</head>');
      if (headEndIndex !== -1) {
        const tailwindScript = '  <script src="https://cdn.tailwindcss.com"></script>\n';
        sanitized =
          sanitized.substring(0, headEndIndex) +
          tailwindScript +
          sanitized.substring(headEndIndex);
        console.log('✅ Injected Tailwind CDN');
      }
    }

    // Check if Babel is needed for React/JSX
    const needsBabel = sanitized.includes('type="text/babel"');
    const hasBabel = sanitized.includes('babel.min.js') || sanitized.includes('@babel/standalone');

    if (needsBabel && !hasBabel) {
      const headEndIndex = sanitized.indexOf('</head>');
      if (headEndIndex !== -1) {
        const babelScript = '  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n';
        sanitized =
          sanitized.substring(0, headEndIndex) +
          babelScript +
          sanitized.substring(headEndIndex);
        console.log('✅ Injected Babel standalone');
      }
    }

    // Ensure React and ReactDOM for React apps
    if (needsBabel && !sanitized.includes('react.development.js')) {
      const headEndIndex = sanitized.indexOf('</head>');
      if (headEndIndex !== -1) {
        const reactScripts = `  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>\n`;
        sanitized =
          sanitized.substring(0, headEndIndex) +
          reactScripts +
          sanitized.substring(headEndIndex);
        console.log('✅ Injected React libraries');
      }
    }

    // Inject navigation interceptor: catches relative link clicks inside the
    // preview iframe and posts a 'navigate' message to the parent instead of
    // letting the browser navigate to the BuildFlow app's own routes.
    const navInterceptorScript = `
  <script>
    (function () {
      document.addEventListener('click', function (e) {
        var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href) return;
        // External links: open in a new tab (safe)
        if (/^(https?:)?\/\//.test(href) || /^mailto:|^tel:/.test(href)) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          return;
        }
        // Hash anchors: allow normal scroll behaviour
        if (href.charAt(0) === '#') return;
        // Relative / absolute app paths: hand off to preview parent
        e.preventDefault();
        window.parent.postMessage({ type: 'navigate', href: href }, '*');
      }, true);
    })();
  </script>`;

    // Add error reporting script
    const errorReportScript = `
  <script>
    window.addEventListener('error', function(e) {
      console.error('Preview error:', e.error || e.message);
      window.parent.postMessage({
        type: 'iframe-error',
        message: e.error?.message || e.message || 'Unknown error'
      }, '*');
    });
  </script>`;

    sanitized = sanitized.replace('</body>', `${navInterceptorScript}\n${errorReportScript}\n</body>`);

    return sanitized;
  }

  // Handle StackBlitz export — exports ALL pages, not just the current one
  async function handleStackBlitzExport() {
    setIsLoadingStackBlitz(true);
    try {
      const { default: sdk } = await import('@stackblitz/sdk');

      const sbFiles: Record<string, string> = {};

      if (pages.length > 0) {
        // Multi-page: export every page as its own HTML file
        for (const page of pages) {
          const filename = page.isHomepage ? 'index.html' : `${page.slug}.html`;
          sbFiles[filename] = page.content || '';
        }
        // Ensure index.html exists
        if (!sbFiles['index.html']) {
          sbFiles['index.html'] = pages[0]?.content || currentContent;
        }
      } else {
        // Single-page fallback
        sbFiles['index.html'] = currentContent;
      }

      // Zero-dependency static file server using Node.js built-ins
      sbFiles['server.js'] = [
        "const http = require('http');",
        "const fs = require('fs');",
        "const path = require('path');",
        "const port = process.env.PORT || 3000;",
        "const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };",
        "http.createServer((req, res) => {",
        "  let p = req.url.split('?')[0];",
        "  if (p === '/' || p === '') p = '/index.html';",
        "  if (!path.extname(p)) p += '.html';",
        "  const file = path.join(__dirname, p);",
        "  fs.readFile(file, (err, data) => {",
        "    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }",
        "    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' });",
        "    res.end(data);",
        "  });",
        "}).listen(port, () => console.log('Server running on http://localhost:' + port));",
      ].join('\n');

      sbFiles['package.json'] = JSON.stringify({
        name: (projectName || 'web-app')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'web-app',
        version: '1.0.0',
        scripts: { dev: 'node server.js' },
        dependencies: {},
      }, null, 2);

      await sdk.openProject(
        {
          title: projectName || 'Web App',
          description: `Preview of ${projectName}`,
          template: 'node',
          files: sbFiles,
        },
        { newWindow: true, openFile: 'index.html' },
      );
      console.log('✅ StackBlitz opened with', Object.keys(sbFiles).length, 'files');
    } catch (error) {
      console.error('❌ Failed to open StackBlitz:', error);
      alert('Failed to open in StackBlitz. Please try the Download button instead.');
    } finally {
      setIsLoadingStackBlitz(false);
    }
  }

  return (
    <div className="w-full h-screen bg-gray-100 flex">
      {/* Sidebar Navigation - Only show if there are multiple pages/files */}
      {hasMultiplePages && showNav && (
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 mb-1">Pages</h3>
            <p className="text-xs text-gray-500">
              {pages.length > 0 ? `${pages.length} pages` : `${htmlFiles.length} files`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Main/Homepage */}
            {!isMultiPage && (
              <button
                onClick={() => setCurrentPage('main')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentPage === 'main'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Main Page</span>
              </button>
            )}

            {/* Pages from database */}
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(page.slug)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentPage === page.slug
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page.isHomepage ? (
                  <Home className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{page.title || page.slug}</span>
              </button>
            ))}

            {/* HTML files */}
            {htmlFiles.length > 0 && pages.length === 0 && (
              <>
                {htmlFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setCurrentPage(file.path)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentPage === file.path
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{file.path}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {hasMultiplePages && (
              <button
                onClick={() => setShowNav(!showNav)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={showNav ? 'Hide navigation' : 'Show navigation'}
              >
                <ChevronRight className={`w-5 h-5 transition-transform ${showNav ? 'rotate-180' : ''}`} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{projectName}</h1>
              <p className="text-sm text-gray-500">
                {currentPage === 'main' ? 'Live Preview' : 
                 pages.find(p => p.slug === currentPage)?.title || currentPage}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStackBlitzExport}
              disabled={isLoadingStackBlitz}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-colors flex items-center gap-2"
              title="Open in StackBlitz"
            >
              <ExternalLink className="w-4 h-4" />
              {isLoadingStackBlitz ? 'Opening...' : 'StackBlitz'}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([currentContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {iframeError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Preview Error</p>
              <p className="text-xs text-red-600">{iframeError}</p>
            </div>
            <button
              onClick={() => setIframeError(null)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Preview iframe */}
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            key={currentPage}
            srcDoc={currentContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            title={`Preview: ${projectName}`}
            onError={(e) => {
              console.error('Iframe error:', e);
              setIframeError('Failed to load preview');
            }}
          />
        </div>
      </div>
    </div>
  );
}
