"use client";
// components/MultiPagePreview.tsx
// Replaces PreviewPanel in GenerationExperience.tsx
//
// Uses srcdoc instead of blob URLs so the iframe runs with a null/opaque origin:
//  - No allow-same-origin needed → no browser security warning
//  - Parent page's CSP is NOT inherited → generated HTML can call external APIs freely
//  - postMessage navigation still works (postMessage is origin-agnostic)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  files: Record<string, string>;
  phase: string;
}

// Injected early (inside <head>) so it runs BEFORE the page's own scripts.
// Must be a single <script> block with no external deps.
const SANDBOX_INTERCEPTOR = `
<script id="__buildflow_sandbox__">
(function() {
  // Helper: resolve a raw href/src value to a bare filename (e.g. "login.html")
  function toFilename(val) {
    if (typeof val !== 'string') return null;
    // Strip leading ./ ../  and keep only the last path segment
    var name = val.split('/').pop() || val;
    // Accept *.html files only (ignore anchors, http URLs, data: etc.)
    if (!name.endsWith('.html')) return null;
    return name;
  }
  function sendNav(filename) {
    window.parent.postMessage({ type: 'navigate', href: filename }, '*');
  }

  // ── 1. navigateTo() trap ─────────────────────────────────────────────────
  // AI-generated pages define navigateTo(page) themselves. We capture the
  // assignment via a property descriptor so our version wins regardless of
  // when the page script runs.
  var _origNav = null;
  Object.defineProperty(window, 'navigateTo', {
    configurable: true,
    enumerable: true,
    get: function() { return _origNav; },
    set: function(fn) {
      // Replace with sandboxed version; discard the original
      _origNav = function sandboxedNav(page) {
        var filename = toFilename(
          typeof page === 'string' && !page.endsWith('.html') ? page + '.html' : page
        );
        if (filename) { sendNav(filename); return; }
        // Non-HTML navigation — let original run (e.g. tab switching)
        if (typeof fn === 'function') { try { fn(page); } catch(e) {} }
      };
    }
  });

  // ── 2. <a> click interception (capture phase) ────────────────────────────
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
    var filename = toFilename(href);
    if (!filename) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendNav(filename);
  }, true);

  // ── 3. <button> click interception for onclick="navigateTo(...)" ─────────
  // If the button has an onclick attribute (inline handler), intercept it
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document.body) {
      var onclick = el.getAttribute && el.getAttribute('onclick');
      if (onclick) {
        var m = onclick.match(/navigateTo\(['"]([^'"]+)['"]\)/);
        if (m) {
          e.preventDefault();
          var filename = toFilename(m[1].endsWith('.html') ? m[1] : m[1] + '.html');
          if (filename) { sendNav(filename); return; }
        }
      }
      el = el.parentElement;
    }
  }, true);

  // ── 4. iframe.src override — catches in-page iframe navigation ───────────
  // Some AI pages open other pages in a nested <iframe id="page-frame">.
  // Intercept assignments so those don't hit the dev server.
  try {
    var iframeDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    if (iframeDesc && iframeDesc.set) {
      Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
        configurable: true,
        get: iframeDesc.get,
        set: function(val) {
          var filename = toFilename(val);
          if (filename) { sendNav(filename); return; }
          iframeDesc.set.call(this, val);
        }
      });
    }
  } catch(e) {}

  // ── 5. history API shim — catches SPA-style navigation ───────────────────
  try {
    var _push = history.pushState.bind(history);
    var _replace = history.replaceState.bind(history);
    history.pushState = function(st, t, url) {
      var f = toFilename(String(url || ''));
      if (f) { sendNav(f); return; }
      try { _push(st, t, url); } catch(e) {}
    };
    history.replaceState = function(st, t, url) {
      var f = toFilename(String(url || ''));
      if (f) { sendNav(f); return; }
      try { _replace(st, t, url); } catch(e) {}
    };
  } catch(e) {}

  // ── 6. window.location.assign / replace ──────────────────────────────────
  try {
    var _assign = location.assign.bind(location);
    var _locReplace = location.replace.bind(location);
    location.assign = function(url) {
      var f = toFilename(String(url || ''));
      if (f) { sendNav(f); return; }
      _assign(url);
    };
    location.replace = function(url) {
      var f = toFilename(String(url || ''));
      if (f) { sendNav(f); return; }
      _locReplace(url);
    };
  } catch(e) {}

  // ── 7. Report load + force reveal animations ──────────────────────────────
  window.addEventListener('load', function() {
    window.parent.postMessage({ type: 'loaded', title: document.title }, '*');
    // Force scroll-reveal elements visible — IntersectionObserver may not fire
    // in a sandboxed srcdoc iframe (null/opaque origin), leaving content at opacity:0.
    try {
      document.querySelectorAll('.reveal').forEach(function(el) {
        el.classList.add('visible');
      });
    } catch(e) {}
  });
})();
</script>
`;

function buildPageContent(
  targetFile: string,
  files: Record<string, string>
): string | null {
  let content = files[targetFile];
  if (!content) return null;

  // Inline shared CSS — handle both href="style.css" and href="./style.css"
  if (files["style.css"]) {
    content = content.replace(
      /<link[^>]*href=["']\.?\/?style\.css["'][^>]*>/i,
      `<style id="shared-css">${files["style.css"]}</style>`
    );
  }

  // Inline shared JS — handle both src="script.js" and src="./script.js"
  if (files["script.js"]) {
    content = content.replace(
      /<script[^>]*src=["']\.?\/?script\.js["'][^>]*><\/script>/i,
      `<script id="shared-js">${files["script.js"]}</script>`
    );
  }

  // Inject the sandbox interceptor EARLY — must run before any page script so
  // the navigateTo() property trap is in place before the page defines it.
  // Insert right after <head> if present; otherwise prepend to the document.
  if (/<head>/i.test(content)) {
    content = content.replace(/<head>/i, `<head>${SANDBOX_INTERCEPTOR}`);
  } else if (/<html[^>]*>/i.test(content)) {
    content = content.replace(/<html[^>]*>/i, (m) => `${m}<head>${SANDBOX_INTERCEPTOR}</head>`);
  } else {
    content = SANDBOX_INTERCEPTOR + content;
  }

  return content;
}

export function MultiPagePreview({ files, phase }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ff = "'Geist Mono','IBM Plex Mono',ui-monospace,monospace";

  // Find the home/index page
  const homeFile = useMemo(() => {
    const priority = ["index.html", "home.html"];
    for (const p of priority) {
      if (files[p]) return p;
    }
    return Object.keys(files).find((f) => f.endsWith(".html")) ?? null;
  }, [files]);

  // All HTML page files (for the page switcher tabs)
  const htmlPages = useMemo(() => {
    return Object.keys(files)
      .filter((f) => f.endsWith(".html") && !f.startsWith("_"))
      .sort((a, b) => {
        if (a === "index.html") return -1;
        if (b === "index.html") return 1;
        return a.localeCompare(b);
      });
  }, [files]);

  // Navigate to a page by filename — uses srcdoc (no blob URL needed)
  const navigateTo = useCallback(
    (filename: string) => {
      const content = buildPageContent(filename, files);
      if (!content) return;

      setLoading(true);
      setCurrentFile(filename);
      if (iframeRef.current) {
        iframeRef.current.srcdoc = content;
      }
    },
    [files]
  );

  // Listen for postMessage navigation events from inside the iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "navigate") {
        const href: string = event.data.href;
        // Resolve relative path (e.g. "../about.html" → "about.html")
        const filename = href.split("/").pop() ?? href;
        navigateTo(filename);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigateTo]);

  // Auto-navigate to home when files first appear
  useEffect(() => {
    if (homeFile && files[homeFile] && !currentFile) {
      navigateTo(homeFile);
    }
  }, [homeFile, files, currentFile, navigateTo]);

  // Re-render current page when its content updates (live update during generation)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentFile && files[currentFile]) {
      navigateTo(currentFile);
    }
  // Only re-run when the CONTENT of the current file changes, not when navigateTo changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files[currentFile ?? ""]]);

  if (phase === "planning" || phase === "planned") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#09090b" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #27272a", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 12, color: "#52525b", fontFamily: ff }}>Planning your build…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!currentFile || !files[currentFile]) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#09090b" }}>
        <div style={{ fontSize: 36, opacity: 0.2 }}>⚡</div>
        <div style={{ fontSize: 12, color: "#3f3f46", fontFamily: ff }}>Preview appears as files are built</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#09090b" }}>
      {/* Page switcher tabs — only shown when there are multiple HTML pages */}
      {htmlPages.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 10px", borderBottom: "1px solid #27272a", overflowX: "auto", flexShrink: 0, background: "#0a0a0b" }}>
          {htmlPages.map((page) => {
            const label = page
              .replace(".html", "")
              .replace(/^index$/, "Home")
              .replace(/^\w/, (c) => c.toUpperCase());
            const isActive = currentFile === page;
            const hasContent = !!files[page];
            return (
              <button
                key={page}
                onClick={() => navigateTo(page)}
                disabled={!hasContent}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                  color: isActive ? "#a5b4fc" : hasContent ? "#71717a" : "#3f3f46",
                  cursor: hasContent ? "pointer" : "default",
                  fontSize: 11,
                  fontFamily: ff,
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: "nowrap",
                  borderBottom: isActive ? "2px solid #6366f1" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {label}
                {!hasContent && <span style={{ marginLeft: 4, opacity: 0.4 }}>⏳</span>}
              </button>
            );
          })}
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#3f3f46", flexShrink: 0, fontFamily: ff }}>
            {currentFile}
          </div>
        </div>
      )}

      {/* iframe — srcdoc avoids blob URLs entirely, so no allow-same-origin is needed.
          Without allow-same-origin the iframe runs with a null/opaque origin:
          - no CSP inheritance from the parent page (generated HTML can fetch freely)
          - no browser security warning about allow-scripts + allow-same-origin */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, width: 14, height: 14, borderRadius: "50%", border: "2px solid #27272a", borderTopColor: "#6366f1", animation: "spin 0.7s linear infinite" }} />
        )}
        <iframe
          ref={iframeRef}
          onLoad={() => setLoading(false)}
          style={{ width: "100%", height: "100%", border: 0, background: "#ffffff" }}
          title="Live preview"
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
