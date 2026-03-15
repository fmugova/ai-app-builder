// ============================================================
// lib/scaffold/reactSpaScaffold.ts
// ============================================================
// Base scaffold files for React SPA projects.
// These are injected BEFORE Claude's generated feature files,
// then Claude's files override scaffold files at the same path.
//
// Two modes:
//   getReactSpaScaffoldFiles()   → full Vite project for download/deploy
//   buildPreviewHtml(files)      → single index.html for iframe preview
//                                  (no npm install needed)
// ============================================================

export function getReactSpaScaffoldFiles(): Record<string, string> {
  return {
    'package.json': PACKAGE_JSON,
    'vite.config.js': VITE_CONFIG,
    'index.html': INDEX_HTML,
    '.gitignore': GITIGNORE,
    'src/main.jsx': MAIN_JSX,
    'src/App.jsx': APP_JSX_STUB,
    'src/styles/globals.css': GLOBALS_CSS,
    'src/hooks/useScrollReveal.js': USE_SCROLL_REVEAL,
    'src/components/Navbar.jsx': NAVBAR_STUB,
    'src/components/Footer.jsx': FOOTER_STUB,
    'src/pages/Home.jsx': HOME_STUB,
  };
}

// ── package.json ──────────────────────────────────────────────────────────────

const PACKAGE_JSON = `{
  "name": "buildflow-react-spa",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react":            "^18.3.1",
    "react-dom":        "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite":                 "^5.4.2",
    "autoprefixer":         "^10.4.20",
    "tailwindcss":          "^3.4.10",
    "postcss":              "^8.4.45"
  }
}`;

// ── vite.config.js ────────────────────────────────────────────────────────────

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    outDir: 'dist',
    // Relative base so the built site works when deployed to a subdirectory
    // e.g. BuildFlow subdomain publishing
    base: './',
  },
});`;

// ── index.html (Vite entry) ───────────────────────────────────────────────────

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

// ── .gitignore ────────────────────────────────────────────────────────────────

const GITIGNORE = `node_modules
dist
.env
.env.local
.DS_Store`;

// ── src/main.jsx ──────────────────────────────────────────────────────────────

const MAIN_JSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

// ── Stub files (overridden by Claude's generated output) ──────────────────────

const APP_JSX_STUB = `import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';

export default function App() {
  return (
    <HashRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
      <Footer />
    </HashRouter>
  );
}`;

const NAVBAR_STUB = `import { Link } from 'react-router-dom';
export default function Navbar() {
  return <nav style={{ padding: '1rem', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
    <Link to="/" style={{ fontWeight: 700 }}>App</Link>
  </nav>;
}`;

const FOOTER_STUB = `export default function Footer() {
  return <footer style={{ padding: '2rem', background: '#111827', color: '#9ca3af', textAlign: 'center' }}>
    <p>&copy; {new Date().getFullYear()} App</p>
  </footer>;
}`;

const HOME_STUB = `export default function Home() {
  return <main style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
    <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>Welcome</h1>
    <p style={{ color: '#6b7280', marginTop: '1rem' }}>Your app is being generated...</p>
  </main>;
}`;

// ── src/styles/globals.css ────────────────────────────────────────────────────

const GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800&display=swap');

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #a5b4fc;
  --secondary: #0ea5e9;
  --accent: #f59e0b;
  --gray-950: #030712;
  --gray-900: #111827;
  --gray-800: #1f2937;
  --gray-700: #374151;
  --gray-500: #6b7280;
  --gray-300: #d1d5db;
  --gray-100: #f3f4f6;
  --gray-50:  #f9fafb;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Poppins', var(--font-sans);
  --max-width: 1200px;
  --section-padding: 80px;
  --radius: 12px;
  --radius-sm: 6px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,.08);
  --shadow-lg: 0 12px 24px rgba(0,0,0,.1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: var(--font-sans); color: var(--gray-900); line-height: 1.6; background: #fff; }
img  { max-width: 100%; height: auto; display: block; }
a    { text-decoration: none; color: inherit; }

.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity .55s ease, transform .55s ease;
}
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Safety net */
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}`;

// ── src/hooks/useScrollReveal.js ──────────────────────────────────────────────

const USE_SCROLL_REVEAL = `import { useEffect, useRef } from 'react';

export function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}`;


// ── Preview HTML builder ───────────────────────────────────────────────────────
//
// Produces a single self-contained index.html that runs the entire
// React SPA in a browser without npm install.
// Used for the BuildFlow chatbuilder iframe preview.
//
// Strategy:
//  1. Load React, ReactDOM, ReactRouterDOM, Babel standalone from CDN
//  2. Inline all generated component files as <script type="text/babel">
//     modules with data-type="module" so imports resolve between them
//  3. Inline globals.css as a <style> tag
//  4. Wire Tailwind CDN
//  5. Entry: render <App /> into #root
//
// Import resolution trick: Babel standalone doesn't support ES module
// imports between inline scripts natively. We solve this by:
//  a) Transforming all imports to use a module registry
//  b) Registering each component in window.__BF_MODULES__ before use
//  c) Replacing import statements with registry lookups
//
// This is the same pattern used by online React playgrounds.

export function buildPreviewHtml(
  files: Record<string, string>,
  siteName: string
): string {
  // Sort files so dependencies are defined before dependents
  // Heuristic: styles → hooks → components → pages → App → main
  const ORDER: Array<(path: string) => boolean> = [
    p => p.endsWith('.css'),
    p => p.startsWith('src/hooks/'),
    p => p.startsWith('src/context/'),
    p => p.startsWith('src/components/'),
    p => p.startsWith('src/pages/'),
    p => p === 'src/App.jsx',
    p => p === 'src/main.jsx',
  ];

  const sortedPaths = Object.keys(files).sort((a, b) => {
    const aOrder = ORDER.findIndex(fn => fn(a));
    const bOrder = ORDER.findIndex(fn => fn(b));
    return (aOrder === -1 ? 99 : aOrder) - (bOrder === -1 ? 99 : bOrder);
  });

  // Collect CSS files
  const cssContent = sortedPaths
    .filter(p => p.endsWith('.css'))
    .map(p => files[p])
    .join('\n\n');

  // Build module registry scripts for JSX files
  // Each file is registered under its path in window.__BF_MODULES__
  // Imports are rewritten: import X from './Foo' → const X = __BF_MODULES__['src/components/Foo.jsx']
  const jsxPaths = sortedPaths.filter(
    p => (p.endsWith('.jsx') || p.endsWith('.js')) && p.startsWith('src/')
  );

  const moduleScripts = jsxPaths.map(filePath => {
    let code = files[filePath] || '';

    // Rewrite imports to use the module registry
    code = rewriteImports(code, filePath);

    // Wrap: transform with Babel, register in window.__BF_MODULES__
    return `
<script type="text/babel" data-presets="react" data-path="${filePath}">
(function() {
  ${code}

  // Register default export
  if (typeof __BF_DEFAULT__ !== 'undefined') {
    window.__BF_MODULES__['${filePath}'] = { default: __BF_DEFAULT__, ...(__BF_NAMED__ || {}) };
  } else {
    window.__BF_MODULES__['${filePath}'] = { ...(__BF_NAMED__ || {}) };
  }
})();
</script>`;
  }).join('\n');

  // Extract title from Home page content if possible
  const homeContent = files['src/pages/Home.jsx'] || '';
  const titleMatch = homeContent.match(/<h1[^>]*>([^<]{3,60})<\/h1>/);
  const pageTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : siteName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(siteName)} — built with BuildFlow AI">

  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: 'var(--primary)',
          }
        }
      }
    }
  </script>

  <!-- Google Fonts (preconnect first for performance) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Inline globals.css -->
  <style id="bf-globals">
${cssContent}
  </style>

  <!-- React 18 + ReactDOM (production UMD) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

  <!-- React Router DOM v6 -->
  <script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.development.js"></script>

  <!-- Babel standalone for JSX transform -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Module registry — components register here, then import from here -->
  <script>
    window.__BF_MODULES__ = {};

    // Make React, ReactDOM, ReactRouterDOM available as module registry entries
    // so import statements rewritten by rewriteImports() resolve correctly.
    window.__BF_MODULES__['react'] = {
      default: React,
      useState: React.useState,
      useEffect: React.useEffect,
      useRef: React.useRef,
      useContext: React.useContext,
      useReducer: React.useReducer,
      useCallback: React.useCallback,
      useMemo: React.useMemo,
      createContext: React.createContext,
      forwardRef: React.forwardRef,
      Fragment: React.Fragment,
    };
    window.__BF_MODULES__['react-dom'] = { default: ReactDOM };
    window.__BF_MODULES__['react-dom/client'] = {
      default: ReactDOM,
      createRoot: ReactDOM.createRoot,
    };
    window.__BF_MODULES__['react-router-dom'] = {
      default: ReactRouterDOM,
      ...ReactRouterDOM,
    };

    // Helper used by rewritten import statements
    window.__BF_IMPORT__ = function(moduleId, callerPath) {
      var mod = window.__BF_MODULES__[moduleId];
      if (!mod) {
        // Try resolving relative paths
        mod = window.__BF_MODULES__[resolveRelative(moduleId, callerPath)];
      }
      if (!mod) {
        console.warn('[BuildFlow] Module not found:', moduleId, '(from', callerPath + ')');
        return {};
      }
      return mod;
    };

    function resolveRelative(importPath, callerPath) {
      if (!importPath.startsWith('.')) return importPath;
      var callerDir = callerPath.split('/').slice(0, -1).join('/');
      var parts = (callerDir + '/' + importPath).split('/');
      var resolved = [];
      for (var p of parts) {
        if (p === '..') resolved.pop();
        else if (p !== '.') resolved.push(p);
      }
      var base = resolved.join('/');
      // Try adding .jsx, .js extensions
      var candidates = [base, base + '.jsx', base + '.js', base + '/index.jsx', base + '/index.js'];
      for (var c of candidates) {
        if (window.__BF_MODULES__[c]) return c;
      }
      return base + '.jsx'; // best guess
    }
  </script>
</head>
<body>
  <div id="root"></div>

${moduleScripts}

  <!-- Safety net: if Babel transform fails, show fallback -->
  <script>
    setTimeout(function() {
      var root = document.getElementById('root');
      if (!root || !root.children.length) {
        root.innerHTML = '<div style="font-family:system-ui;padding:3rem;text-align:center"><h1 style="font-size:1.5rem;margin-bottom:.5rem">Preview loading...</h1><p style="color:#6b7280">If this persists, download and run locally with <code>npm install && npm run dev</code></p></div>';
      }
    }, 4000);
  </script>
</body>
</html>`;
}

// ── Import rewriter ────────────────────────────────────────────────────────────
// Transforms ES module import statements into registry lookups.
// This allows multiple inline <script type="text/babel"> blocks
// to share modules without a bundler.

function rewriteImports(code: string, filePath: string): string {
  let transformed = code;

  // Named + default import: import Foo, { bar, baz } from 'module'
  transformed = transformed.replace(
    /^import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm,
    (_, def, named, mod) => {
      const namedParts = named.split(',').map((s: string) => s.trim()).filter(Boolean).join(', ');
      return `var ${def} = __BF_IMPORT__('${mod}', '${filePath}').default;\n` +
             `var { ${namedParts} } = __BF_IMPORT__('${mod}', '${filePath}');`;
    }
  );

  // Default only: import Foo from 'module'
  transformed = transformed.replace(
    /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/gm,
    (_, name, mod) => `var ${name} = __BF_IMPORT__('${mod}', '${filePath}').default;`
  );

  // Named only: import { a, b as c } from 'module'
  transformed = transformed.replace(
    /^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm,
    (_, named, mod) => {
      const namedParts = named.split(',').map((s: string) => s.trim()).filter(Boolean).join(', ');
      return `var { ${namedParts} } = __BF_IMPORT__('${mod}', '${filePath}');`;
    }
  );

  // Namespace: import * as NS from 'module'
  transformed = transformed.replace(
    /^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/gm,
    (_, ns, mod) => `var ${ns} = __BF_IMPORT__('${mod}', '${filePath}');`
  );

  // Side-effect only: import 'module'  →  (ignore CSS imports, they're inlined)
  transformed = transformed.replace(/^import\s+['"][^'"]+['"]\s*;?/gm, '// (side-effect import removed for preview)');

  // export default function/class/const/arrow
  // → keep the declaration, then assign __BF_DEFAULT__
  transformed = transformed.replace(
    /^export\s+default\s+function\s+(\w+)/gm,
    'function $1'
  ).replace(
    /^export\s+default\s+class\s+(\w+)/gm,
    'class $1'
  );

  // Collect exported names for __BF_NAMED__
  const namedExports: string[] = [];

  // export const/let/var/function/class Foo
  transformed = transformed.replace(
    /^export\s+(const|let|var|function|class)\s+(\w+)/gm,
    (_, keyword, name) => {
      namedExports.push(name);
      return `${keyword} ${name}`;
    }
  );

  // export { a, b, c }
  transformed = transformed.replace(
    /^export\s+\{([^}]+)\}/gm,
    (_, names) => {
      names.split(',').forEach((n: string) => {
        const trimmed = n.trim().split(/\s+as\s+/)[0].trim();
        if (trimmed) namedExports.push(trimmed);
      });
      return '// (re-export removed for preview)';
    }
  );

  // Remaining bare export default (expression)
  const defaultMatch = transformed.match(/^export\s+default\s+(\w+)/m);
  const defaultName = defaultMatch ? defaultMatch[1] : null;
  transformed = transformed.replace(/^export\s+default\s+/gm, 'var __BF_DEFAULT__ = ');

  // Append named exports object
  if (namedExports.length > 0) {
    transformed += `\nvar __BF_NAMED__ = { ${namedExports.join(', ')} };`;
  }

  // If there was an explicit default name, set __BF_DEFAULT__ from it
  if (defaultName && !transformed.includes('var __BF_DEFAULT__')) {
    transformed += `\nvar __BF_DEFAULT__ = ${defaultName};`;
  }

  return transformed;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
