"use client";
// components/MultiPagePreview.tsx
// Replaces PreviewPanel in GenerationExperience.tsx
//
// THE FIX: Intercepts <a href="*.html"> clicks inside the iframe via postMessage,
// then creates a new blob URL for the target page and updates the iframe src.
// This makes relative links work inside blob:// preview contexts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  files: Record<string, string>;
  phase: string;
}

const LINK_INTERCEPTOR = `
<script>
(function() {
  // Intercept all link clicks and post to parent
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;
    // Only intercept relative .html links (not #anchors, not http://, not mailto:)
    if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
    if (!href.endsWith('.html') && !href.includes('.html')) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'navigate', href: href }, '*');
  });

  // Tell parent what page we are (for active nav highlighting)
  window.parent.postMessage({ type: 'loaded', title: document.title }, '*');
})();
</script>
`;

function buildBlobContent(
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

  // Inject the link interceptor before </body>
  content = content.replace(/<\/body>/i, `${LINK_INTERCEPTOR}</body>`);

  return content;
}

export function MultiPagePreview({ files, phase }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

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

  // Navigate to a page by filename
  const navigateTo = useCallback(
    (filename: string) => {
      const content = buildBlobContent(filename, files);
      if (!content) return;

      // Revoke old blob URL for this file to avoid memory leaks
      const existingUrl = blobUrlsRef.current.get(filename);
      if (existingUrl) URL.revokeObjectURL(existingUrl);

      const url = URL.createObjectURL(new Blob([content], { type: "text/html" }));
      blobUrlsRef.current.set(filename, url);

      setLoading(true);
      setCurrentFile(filename);
      if (iframeRef.current) {
        iframeRef.current.src = url;
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

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

      {/* iframe */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, width: 14, height: 14, borderRadius: "50%", border: "2px solid #27272a", borderTopColor: "#6366f1", animation: "spin 0.7s linear infinite" }} />
        )}
        <iframe
          ref={iframeRef}
          onLoad={() => setLoading(false)}
          style={{ width: "100%", height: "100%", border: 0, background: "#ffffff" }}
          title="Live preview"
          sandbox="allow-scripts allow-same-origin"
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
