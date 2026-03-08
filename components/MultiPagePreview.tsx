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
  // ── 0. Mock localStorage ──────────────────────────────────────────────────
  // Sandboxed srcdoc iframes run with a null/opaque origin, which causes
  // localStorage access to throw SecurityError. Apps (task managers, notes,
  // calculators, etc.) rely on localStorage for CRUD — mock it with an
  // in-memory store so all app functionality works in preview.
  // Data won't persist across reloads, but add/edit/delete all work normally.
  try {
    localStorage.getItem('__test__');
  } catch(e) {
    var _ls = {};
    var _lsMock = {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(_ls, k) ? _ls[k] : null; },
      setItem: function(k, v) { _ls[String(k)] = String(v); },
      removeItem: function(k) { delete _ls[String(k)]; },
      clear: function() { _ls = {}; },
      get length() { return Object.keys(_ls).length; },
      key: function(n) { return Object.keys(_ls)[n] || null; }
    };
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, get: function() { return _lsMock; } });
    } catch(e2) {}
    try {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, get: function() { return _lsMock; } });
    } catch(e2) {}
  }

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

  // ── 7. Mock fetch for auth endpoints ─────────────────────────────────────
  // Before a project is saved the auth URL contains the literal placeholder
  // string "BUILDFLOW_PROJECT_ID". Fetching that URL from a sandboxed iframe
  // (null origin, no allow-same-origin) would fail with a CORS/network error.
  // Intercept those calls and return realistic mock responses so signup/login
  // work in the preview without hitting the real API.
  (function() {
    var _realFetch = window.fetch;
    window.fetch = function(url, opts) {
      var u = String(url || '');
      // ── Data API mock ───────────────────────────────────────────────────
      if (u.indexOf('/api/public/data/') !== -1) {
        try {
          var dataStore = '__preview_data__';
          var store2 = {};
          try { store2 = JSON.parse(localStorage.getItem(dataStore) || '{}'); } catch(e2) {}
          function saveStore(s) { try { localStorage.setItem(dataStore, JSON.stringify(s)); } catch(e2) {} }
          function dataRespond(d, st) {
            return Promise.resolve(new Response(JSON.stringify(d), {
              status: st || 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          var method = (opts && opts.method || 'GET').toUpperCase();
          // Parse ?collection= and ?id= from URL
          var qs = u.split('?')[1] || '';
          var qp = {};
          qs.split('&').forEach(function(p) { var kv = p.split('='); if (kv[0]) qp[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });
          var col = qp['collection'] || 'default';
          var recId = qp['id'];
          if (!store2[col]) store2[col] = [];

          if (method === 'GET') {
            var lim = parseInt(qp['limit'] || '100');
            var off = parseInt(qp['offset'] || '0');
            var recs = store2[col].slice(off, off + lim);
            return dataRespond({ records: recs, total: store2[col].length, limit: lim, offset: off });
          }
          if (method === 'POST') {
            var pb = opts && opts.body ? JSON.parse(String(opts.body)) : {};
            col = pb.collection || col;
            if (!store2[col]) store2[col] = [];
            var newRec = Object.assign({ id: 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { data: pb.data });
            store2[col].unshift(newRec);
            saveStore(store2);
            return dataRespond({ record: newRec }, 201);
          }
          if (method === 'PATCH') {
            var pb2 = opts && opts.body ? JSON.parse(String(opts.body)) : {};
            var found = false;
            store2[col] = store2[col].map(function(r) {
              if (r.id !== recId) return r;
              found = true;
              return Object.assign({}, r, { data: Object.assign({}, r.data, pb2.data), updatedAt: new Date().toISOString() });
            });
            if (!found) return dataRespond({ error: 'Record not found' }, 404);
            saveStore(store2);
            return dataRespond({ record: store2[col].find(function(r) { return r.id === recId; }) });
          }
          if (method === 'DELETE') {
            var before = store2[col].length;
            store2[col] = store2[col].filter(function(r) { return r.id !== recId; });
            if (store2[col].length === before) return dataRespond({ error: 'Record not found' }, 404);
            saveStore(store2);
            return dataRespond({ success: true });
          }
        } catch(e) {}
      }

      if (u.indexOf('BUILDFLOW_PROJECT_ID') !== -1 || (u.indexOf('/api/public/auth/') !== -1)) {
        try {
          var body = opts && opts.body ? JSON.parse(String(opts.body)) : {};
          var action = String(body.action || '');
          var email  = String(body.email  || '').toLowerCase().trim();
          var name   = String(body.name   || '');
          var password = String(body.password || '');
          var storeKey = '__preview_auth__';
          var store = {};
          try { store = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch(e) {}
          function respond(data, status) {
            return Promise.resolve(new Response(JSON.stringify(data), {
              status: status || 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          if (action === 'register') {
            if (!email || !password) return respond({ success: false, error: 'Email and password are required' }, 400);
            if (password.length < 8) return respond({ success: false, error: 'Password must be at least 8 characters' }, 400);
            if (store[email]) return respond({ success: false, error: 'An account with this email already exists' }, 409);
            store[email] = { password: password, name: name };
            try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch(e) {}
            var token = 'preview-' + Date.now();
            return respond({ success: true, token: token, user: { id: 'preview', email: email, name: name } });
          }
          if (action === 'login') {
            if (!email || !password) return respond({ success: false, error: 'Email and password are required' }, 400);
            var u2 = store[email];
            if (!u2 || u2.password !== password) return respond({ success: false, error: 'Invalid email or password' }, 401);
            var token2 = 'preview-' + Date.now();
            return respond({ success: true, token: token2, user: { id: 'preview', email: email, name: u2.name } });
          }
          if (action === 'me') {
            return respond({ success: true, user: { id: 'preview', email: email, name: name } });
          }
        } catch(e) {}
      }
      return _realFetch.apply(this, arguments);
    };
  })();

  // ── 8. Report load + force reveal animations ──────────────────────────────
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
