"use client";
// components/preview/WebContainerPreview.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scanProject, type ScanResult } from "@/preview/scan";
import { patchForFastPreview, toMountTree } from "@/preview/patchPrismaForFast";

type FlatFiles = Record<string, string>;
type FileNode = { name: string; path: string; isDir: boolean; children?: FileNode[] };
type PreviewStatus = "idle"|"fetching"|"booting"|"mounting"|"installing"|"running"|"ready"|"error";

interface Props {
  projectId: string;
  initialFiles?: FlatFiles;
  onPreviewReady?: (url: string) => void;
  onFastFailed?: (reason: string) => void;
}

function buildTree(files: FlatFiles): FileNode {
  const root: FileNode = { name: "", path: "", isDir: true, children: [] };
  for (const fullPath of Object.keys(files).sort()) {
    const parts = fullPath.split("/").filter(Boolean);
    let curr = root;
    let currPath = "";
    parts.forEach((part, idx) => {
      currPath = currPath ? `${currPath}/${part}` : part;
      const isDir = idx < parts.length - 1;
      if (!curr.children) curr.children = [];
      let next = curr.children.find((c) => c.name === part);
      if (!next) {
        next = { name: part, path: currPath, isDir, children: isDir ? [] : undefined };
        curr.children.push(next);
        curr.children.sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      }
      curr = next;
    });
  }
  return root;
}

const STATUS_LABELS: Record<PreviewStatus, string> = {
  idle: "Ready", fetching: "Loading files…", booting: "Booting WebContainer…",
  mounting: "Mounting project…", installing: "Installing dependencies…",
  running: "Starting dev server…", ready: "Preview ready", error: "Error",
};
const STATUS_COLORS: Record<PreviewStatus, string> = {
  idle: "#6b7280", fetching: "#8b5cf6", booting: "#8b5cf6", mounting: "#8b5cf6",
  installing: "#f59e0b", running: "#f59e0b", ready: "#10b981", error: "#ef4444",
};

export function WebContainerPreview({ projectId, initialFiles, onPreviewReady, onFastFailed }: Props) {
  const [files, setFiles] = useState<FlatFiles>(initialFiles ?? {});
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [patchNotes, setPatchNotes] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [editorValue, setEditorValue] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["src", "app", "lib"]));
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const wcRef = useRef<any>(null);
  const devProcRef = useRef<any>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFiles) {
      setFiles(initialFiles);
      setScan(scanProject(initialFiles));
      const first = Object.keys(initialFiles)[0];
      if (first) { setSelectedPath(first); setEditorValue(initialFiles[first]); }
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("fetching");
      try {
        const res = await fetch(`/api/projects/${projectId}/files`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const fetched: FlatFiles = data.files ?? {};
        setFiles(fetched);
        setScan(scanProject(fetched));
        const first = Object.keys(fetched).find((p) => p.includes("page.tsx")) ?? Object.keys(fetched)[0];
        if (first) { setSelectedPath(first); setEditorValue(fetched[first] ?? ""); }
        setStatus("idle");
      } catch (e: any) {
        if (!cancelled) { setStatus("error"); setErrorMsg(e?.message ?? "Failed to fetch"); }
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, initialFiles]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const appendLog = useCallback((chunk: string) => { setLogs((prev) => [...prev, chunk]); }, []);

  async function startPreview() {
    if (!Object.keys(files).length) return;
    try {
      setLogs([]); setPreviewUrl(""); setErrorMsg("");
      setStatus("booting");
      const currentScan = scan ?? scanProject(files);
      const { files: patched, notes } = patchForFastPreview(files, currentScan);
      setPatchNotes(notes);
      if (notes.length) appendLog(`⚡ Patches applied:\n${notes.map((n) => `  • ${n}`).join("\n")}\n`);

      if (!wcRef.current) {
        const { WebContainer: WC } = await import("@webcontainer/api");
        wcRef.current = await WC.boot();
        appendLog("🟢 WebContainer booted\n");
      }
      const wc = wcRef.current;
      try { devProcRef.current?.kill(); } catch {}

      setStatus("mounting");
      await wc.mount(toMountTree(patched));
      appendLog(`📁 Mounted ${Object.keys(patched).length} files\n`);

      setStatus("installing");
      appendLog("📦 Running npm install…\n");
      const install = await wc.spawn("npm", ["install"]);
      install.output.pipeTo(new WritableStream({ write: (chunk: string) => appendLog(chunk) }));
      const exitCode = await install.exit;
      if (exitCode !== 0) {
        const msg = `npm install failed (exit ${exitCode})`;
        setStatus("error"); setErrorMsg(msg); onFastFailed?.(msg); return;
      }
      appendLog("\n✅ Dependencies installed\n\n");

      setStatus("running");
      appendLog("🚀 Starting dev server…\n");
      const dev = await wc.spawn("npm", ["run", "dev"], {
        env: { PORT: "3000", HOSTNAME: "0.0.0.0", NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1" },
      });
      devProcRef.current = dev;
      dev.output.pipeTo(new WritableStream({ write: (chunk: string) => appendLog(chunk) }));

      wc.on("server-ready", (port: number, url: string) => {
        appendLog(`\n✅ Server ready on port ${port}: ${url}\n`);
        setStatus("ready"); setPreviewUrl(url); onPreviewReady?.(url);
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setStatus("error"); setErrorMsg(msg); appendLog(`\n❌ Error: ${msg}\n`); onFastFailed?.(msg);
    }
  }

  async function saveFile() {
    if (!wcRef.current || !selectedPath) return;
    await wcRef.current.fs.writeFile(selectedPath, editorValue);
    setFiles((prev) => ({ ...prev, [selectedPath]: editorValue }));
    appendLog(`💾 Saved: ${selectedPath}\n`);
  }

  const tree = useMemo(() => buildTree(files), [files]);

  function toggleDir(path: string) {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  function renderNode(node: FileNode, depth = 0): React.ReactNode {
    if (node.path === "") return (node.children ?? []).map((c) => renderNode(c, depth));
    const indent = depth * 14;
    const isSelected = node.path === selectedPath;
    const isExpanded = expandedDirs.has(node.path);
    if (node.isDir) {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleDir(node.path)}
            style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", textAlign: "left", paddingLeft: indent + 8, paddingTop: 4, paddingBottom: 4, paddingRight: 8, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", fontSize: 12, fontFamily: "inherit", borderRadius: 4 }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>{isExpanded ? "▼" : "▶"}</span>
            <span>📁</span><span style={{ fontWeight: 600 }}>{node.name}</span>
          </button>
          {isExpanded && <div>{(node.children ?? []).map((c) => renderNode(c, depth + 1))}</div>}
        </div>
      );
    }
    return (
      <button
        key={node.path}
        onClick={() => { setSelectedPath(node.path); setEditorValue(files[node.path] ?? ""); }}
        style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", textAlign: "left", paddingLeft: indent + 8, paddingTop: 4, paddingBottom: 4, paddingRight: 8, border: "none", background: isSelected ? "rgba(139,92,246,0.18)" : "transparent", cursor: "pointer", color: isSelected ? "#a78bfa" : "#d1d5db", fontSize: 12, fontFamily: "inherit", borderRadius: 4, borderLeft: isSelected ? "2px solid #8b5cf6" : "2px solid transparent" }}
      >
        <span>📄</span><span>{node.name}</span>
      </button>
    );
  }

  const statusColor = STATUS_COLORS[status];
  const isRunning = ["booting", "mounting", "installing", "running"].includes(status);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gridTemplateRows: "auto 1fr auto", height: "100%", background: "#0f1117", color: "#e5e7eb", fontFamily: "'IBM Plex Mono',ui-monospace,monospace", fontSize: 13, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0a0c12" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0, animation: isRunning ? "pulse 1.5s ease-in-out infinite" : "none" }} />
        <span style={{ fontSize: 11, color: statusColor, fontWeight: 700 }}>{STATUS_LABELS[status]}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={startPreview} disabled={isRunning || !Object.keys(files).length} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(139,92,246,0.4)", background: isRunning ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.25)", color: "#a78bfa", cursor: isRunning ? "wait" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            {isRunning ? "⏳ Running…" : "▶ Start Preview"}
          </button>
          <button onClick={saveFile} disabled={!selectedPath || !wcRef.current} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>💾 Save</button>
          {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)", color: "#34d399", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>↗ Open</a>}
        </div>
      </div>

      {/* File explorer */}
      <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", overflow: "auto", padding: "8px 0" }}>
        <div style={{ padding: "0 8px 8px", fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Explorer</div>
        {renderNode(tree)}
        {scan && (
          <div style={{ margin: "12px 8px 0", padding: 8, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Detection</div>
            {scan.detected.prisma && <div style={{ fontSize: 11, color: "#f59e0b" }}>⚡ Prisma (mocked)</div>}
            {scan.detected.supabase && <div style={{ fontSize: 11, color: "#60a5fa" }}>✓ Supabase</div>}
            {scan.detected.nextApp && <div style={{ fontSize: 11, color: "#a78bfa" }}>▲ Next.js</div>}
          </div>
        )}
      </div>

      {/* Preview + logs */}
      <div style={{ display: "grid", gridTemplateRows: "1fr 200px", overflow: "hidden" }}>
        <div style={{ position: "relative", overflow: "hidden" }}>
          {status === "ready" && previewUrl ? (
            <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: 0 }} title="Preview" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, opacity: 0.5 }}>
              {isRunning
                ? <><div style={{ fontSize: 32 }}>⏳</div><div style={{ fontSize: 13 }}>{STATUS_LABELS[status]}</div></>
                : status === "error"
                ? <><div style={{ fontSize: 32 }}>❌</div><div style={{ fontSize: 13, color: "#ef4444", maxWidth: 320, textAlign: "center" }}>{errorMsg}</div><button onClick={startPreview} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>Retry</button></>
                : <><div style={{ fontSize: 32 }}>⚡</div><div style={{ fontSize: 13 }}>Click Start Preview</div></>}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", overflow: "auto", padding: "8px 12px", background: "#070910" }}>
          <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Terminal</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 11, lineHeight: 1.6, color: "#9ca3af" }}>{logs.join("") || "No output yet"}</pre>
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Editor */}
      <div style={{ gridColumn: "1/-1", borderTop: "1px solid rgba(255,255,255,0.08)", display: "grid", gridTemplateRows: "auto 1fr", height: 220, background: "#0a0c12" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{selectedPath || "No file selected"}</span>
          {patchNotes.length > 0 && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>{patchNotes.length} patches applied</span>}
        </div>
        <textarea
          value={editorValue}
          onChange={(e) => setEditorValue(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: "#e5e7eb", fontFamily: "inherit", fontSize: 12, padding: "8px 12px", lineHeight: 1.7, boxSizing: "border-box" }}
        />
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
