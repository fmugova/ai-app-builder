"use client";
// components/GenerationExperience.tsx
// The complete generation experience: plan -> execute -> preview
// Better than Bolt: preview works, quality score shown, file tree is live

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GenerationPlan, PlanStep, StepStatus } from "@/lib/api/planGeneration";

// --- Types ---

interface GenerationState {
  phase: "idle" | "planning" | "planned" | "executing" | "done" | "error";
  plan: GenerationPlan | null;
  currentStepId: string | null;
  completedSteps: Set<string>;
  files: Record<string, string>;
  previewFile: string | null;
  qualityScore: number | null;
  errorMessage: string | null;
  startedAt: number | null;
  elapsedMs: number;
}

interface Props {
  prompt: string;
  siteName: string;
  onComplete?: (files: Record<string, string>, score: number, projectId?: string) => void;
  onCancel?: () => void;
  /** Called when the user explicitly clicks "Open in Editor" after generation finishes */
  onOpenInBuilder?: () => void;
  /** Your generation SSE endpoint, e.g. "/api/generate/stream" */
  generationApiUrl: string;
}

// --- Category metadata ---

const CATEGORY_ICONS: Record<string, string> = {
  schema: "🗄",
  config: "⚙",
  types: "🔷",
  component: "🧩",
  hook: "🔗",
  page: "📄",
  api: "🔌",
  style: "🎨",
  test: "🧪",
  build: "🔨",
};

const CATEGORY_COLORS: Record<string, string> = {
  schema: "#f59e0b",
  config: "#6b7280",
  types: "#3b82f6",
  component: "#8b5cf6",
  hook: "#ec4899",
  page: "#10b981",
  api: "#f97316",
  style: "#06b6d4",
  test: "#84cc16",
  build: "#a78bfa",
};

// --- Main component ---

export function GenerationExperience({
  prompt,
  siteName,
  onComplete,
  onCancel,
  onOpenInBuilder,
  generationApiUrl,
}: Props) {
  const [state, setState] = useState<GenerationState>({
    phase: "idle",
    plan: null,
    currentStepId: null,
    completedSteps: new Set(),
    files: {},
    previewFile: null,
    qualityScore: null,
    errorMessage: null,
    startedAt: null,
    elapsedMs: 0,
  });

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(["src", "app", "components"])
  );
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const sseRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (state.phase === "executing" && state.startedAt) {
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedMs: Date.now() - (prev.startedAt ?? Date.now()),
        }));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.startedAt]);

  function start() {
    setState((prev) => ({ ...prev, phase: "planning" }));

    const es = new EventSource(
      `${generationApiUrl}?prompt=${encodeURIComponent(prompt)}&name=${encodeURIComponent(siteName)}`
    );
    sseRef.current = es;

    es.addEventListener("plan", (e) => {
      const plan: GenerationPlan = JSON.parse((e as MessageEvent).data);
      setState((prev) => ({ ...prev, phase: "planned", plan, startedAt: Date.now() }));
      // Auto-start execution after 800ms (shows plan briefly)
      setTimeout(() => setState((prev) => ({ ...prev, phase: "executing" })), 800);
    });

    es.addEventListener("step_start", (e) => {
      const { stepId } = JSON.parse((e as MessageEvent).data);
      setState((prev) => ({ ...prev, currentStepId: stepId }));
    });

    es.addEventListener("step_done", (e) => {
      const { stepId } = JSON.parse((e as MessageEvent).data);
      setState((prev) => {
        const next = new Set(prev.completedSteps);
        next.add(stepId);
        return { ...prev, completedSteps: next, currentStepId: null };
      });
    });

    es.addEventListener("file", (e) => {
      const { path, content } = JSON.parse((e as MessageEvent).data);
      setState((prev) => {
        const files = { ...prev.files, [path]: content };
        const previewFile =
          prev.previewFile ?? (isPreviewable(path) ? path : null);
        if (!prev.previewFile && previewFile) setSelectedFile(previewFile);
        return { ...prev, files, previewFile: previewFile ?? prev.previewFile };
      });
    });

    es.addEventListener("quality", (e) => {
      const { score } = JSON.parse((e as MessageEvent).data);
      setState((prev) => ({ ...prev, qualityScore: score }));
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setState((prev) => ({
        ...prev,
        phase: "done",
        qualityScore: data.qualityScore ?? prev.qualityScore,
        files: data.files ?? prev.files,
      }));
      es.close();
      onComplete?.(data.files, data.qualityScore, data.projectId);
    });

    es.addEventListener("error_event", (e) => {
      const { message } = JSON.parse((e as MessageEvent).data);
      setState((prev) => ({ ...prev, phase: "error", errorMessage: message }));
      es.close();
    });

    es.onerror = () => {
      setState((prev) => {
        if (prev.phase === "done") return prev;
        return { ...prev, phase: "error", errorMessage: "Connection lost — please retry" };
      });
      es.close();
    };
  }

  useEffect(() => {
    start();
    return () => {
      sseRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived
  const fileTree = useMemo(() => buildFileTree(state.files), [state.files]);
  const fileCount = Object.keys(state.files).length;
  const elapsed = formatElapsed(state.elapsedMs);

  function getStepStatus(step: PlanStep): StepStatus {
    if (state.completedSteps.has(step.id)) return "done";
    if (state.currentStepId === step.id) return "running";
    return "pending";
  }

  const ff = "'Geist Mono','IBM Plex Mono',ui-monospace,monospace";
  const isDone = state.phase === "done";
  const isExecuting = state.phase === "executing";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        height: "100vh",
        background: "#09090b",
        color: "#e4e4e7",
        fontFamily: ff,
        fontSize: 13,
        overflow: "hidden",
      }}
    >
      {/* LEFT PANEL: Plan + Steps */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #27272a",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #27272a",
            background: "#0a0a0b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#fafafa" }}>
                {siteName || "Building…"}
              </div>
              <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>
                {state.phase === "planning" && "Analysing your prompt…"}
                {state.phase === "planned" && "Plan ready — starting build"}
                {state.phase === "executing" && `Building · ${elapsed}`}
                {state.phase === "done" && `Done · ${fileCount} files · ${elapsed}`}
                {state.phase === "error" && "Error — see below"}
              </div>
            </div>
            {state.qualityScore !== null && (
              <QualityBadge score={state.qualityScore} ff={ff} />
            )}
          </div>
        </div>

        {/* Progress bar */}
        {(isExecuting || isDone) && state.plan && (
          <div style={{ height: 3, background: "#27272a" }}>
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                width: `${(state.completedSteps.size / state.plan.steps.length) * 100}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        )}

        {/* Planning spinner */}
        {state.phase === "planning" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <Spinner size={40} />
            <div style={{ fontSize: 12, color: "#71717a" }}>Reading your prompt…</div>
          </div>
        )}

        {/* Steps list */}
        {state.plan && state.phase !== "planning" && (
          <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
            {state.plan.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                status={getStepStatus(step)}
                index={i}
                ff={ff}
              />
            ))}

            {/* Summary when done */}
            {isDone && (
              <div
                style={{
                  margin: "12px 16px",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                <div style={{ fontWeight: 800, color: "#a5b4fc", fontSize: 13 }}>
                  ✓ Build complete
                </div>
                <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
                  {fileCount} files · {state.plan.steps.length} steps · {elapsed}
                </div>
              </div>
            )}

            {/* Error */}
            {state.phase === "error" && (
              <div
                style={{
                  margin: "12px 16px",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <div style={{ fontWeight: 800, color: "#f87171", fontSize: 13 }}>
                  Build failed
                </div>
                <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>
                  {state.errorMessage}
                </div>
                <button
                  onClick={start}
                  style={{
                    marginTop: 8,
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: ff,
                    fontWeight: 700,
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #27272a",
            display: "flex",
            gap: 8,
          }}
        >
          {isDone && (
            <button
              onClick={() => onOpenInBuilder?.()}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 800,
                fontFamily: ff,
              }}
            >
              Open in Editor →
            </button>
          )}
          {isDone && (
            <button
              onClick={() => start()}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                background: "transparent",
                color: "#a1a1aa",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: ff,
              }}
            >
              Regenerate
            </button>
          )}
          {!isDone && (
            <button
              onClick={() => {
                sseRef.current?.close();
                onCancel?.();
              }}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                background: "transparent",
                color: "#71717a",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: ff,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: File tree + Preview/Code */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          overflow: "hidden",
        }}
      >
        {/* File tree */}
        <div
          style={{
            borderRight: "1px solid #27272a",
            overflow: "auto",
            background: "#0a0a0b",
          }}
        >
          <div
            style={{
              padding: "10px 12px 6px",
              fontSize: 10,
              color: "#52525b",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
            }}
          >
            Files{" "}
            {fileCount > 0 && (
              <span style={{ color: "#6366f1" }}>{fileCount}</span>
            )}
          </div>
          {renderFileTree(
            fileTree,
            0,
            selectedFile,
            setSelectedFile,
            expandedDirs,
            setExpandedDirs,
            state.files
          )}
          {fileCount === 0 && (
            <div
              style={{
                padding: "20px 12px",
                fontSize: 11,
                color: "#3f3f46",
                textAlign: "center",
              }}
            >
              Files appear as they&apos;re built
            </div>
          )}
        </div>

        {/* Preview / code panel */}
        <div
          style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #27272a",
              background: "#0a0a0b",
              padding: "0 12px",
            }}
          >
            {(["preview", "code"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? "#6366f1" : "transparent"}`,
                  background: "transparent",
                  color: activeTab === tab ? "#a5b4fc" : "#52525b",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontFamily: ff,
                  textTransform: "capitalize",
                }}
              >
                {tab === "preview" ? "👁 Preview" : "</> Code"}
              </button>
            ))}
            {selectedFile && (
              <div style={{ marginLeft: "auto", fontSize: 11, color: "#52525b" }}>
                {selectedFile}
              </div>
            )}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {activeTab === "preview" ? (
              <PreviewPanel
                files={state.files}
                previewFile={state.previewFile}
                phase={state.phase}
              />
            ) : (
              <CodePanel
                content={selectedFile ? (state.files[selectedFile] ?? "") : ""}
                filename={selectedFile ?? ""}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  );
}

// --- Step row ---

function StepRow({
  step,
  status,
  index: _index,
  ff,
}: {
  step: PlanStep;
  status: StepStatus;
  index: number;
  ff: string;
}) {
  const color = CATEGORY_COLORS[step.category] ?? "#6b7280";
  const icon = CATEGORY_ICONS[step.category] ?? "📄";

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "9px 16px",
        background: status === "running" ? "rgba(99,102,241,0.06)" : "transparent",
        borderLeft: `2px solid ${status === "running" ? "#6366f1" : "transparent"}`,
        transition: "all 0.2s",
      }}
    >
      {/* Status indicator */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        {status === "done" && <CheckIcon />}
        {status === "running" && <Spinner size={16} />}
        {status === "pending" && (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "1.5px solid #3f3f46",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span
            style={{
              fontWeight: status === "pending" ? 500 : 700,
              color: status === "pending" ? "#71717a" : "#fafafa",
              fontSize: 12,
            }}
          >
            {step.label}
          </span>
          {status === "running" && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(99,102,241,0.2)",
                color: "#a5b4fc",
              }}
            >
              building
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#52525b",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {step.detail}
        </div>
        {step.files.length > 0 && status !== "pending" && (
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
            {step.files.slice(0, 3).map((f) => (
              <span
                key={f}
                style={{
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: "#1c1c1e",
                  color,
                  border: `1px solid ${color}33`,
                  fontFamily: ff,
                }}
              >
                {f.split("/").pop()}
              </span>
            ))}
            {step.files.length > 3 && (
              <span style={{ fontSize: 10, color: "#52525b" }}>
                +{step.files.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Preview panel ---

function PreviewPanel({
  files,
  previewFile,
  phase,
}: {
  files: Record<string, string>;
  previewFile: string | null;
  phase: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Build blob URL for HTML preview — inlines CSS/JS for instant render
  const blobUrl = useMemo(() => {
    const file =
      previewFile ??
      Object.keys(files).find((p) => p === "index.html" || p.endsWith("index.html"));
    if (!file || !files[file]) return null;

    let content = files[file];

    // Inline style.css so iframe renders without needing a server
    if (files["style.css"]) {
      content = content.replace(
        '<link rel="stylesheet" href="style.css">',
        `<style>${files["style.css"]}</style>`
      );
    }

    // Inline script.js
    if (files["script.js"]) {
      content = content.replace(
        '<script src="script.js"></script>',
        `<script>${files["script.js"]}</script>`
      );
    }

    return URL.createObjectURL(new Blob([content], { type: "text/html" }));
  }, [files, previewFile]);

  useEffect(() => {
    if (blobUrl && iframeRef.current) {
      setReady(false);
      iframeRef.current.src = blobUrl;
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (phase === "planning" || phase === "planned") {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#09090b",
        }}
      >
        <Spinner size={48} />
        <div style={{ fontSize: 12, color: "#52525b" }}>Planning your build…</div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "#09090b",
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.3 }}>⚡</div>
        <div style={{ fontSize: 12, color: "#3f3f46" }}>
          Preview appears as files are built
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative", background: "#ffffff" }}>
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#09090b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Spinner size={24} />
        </div>
      )}
      <iframe
        ref={iframeRef}
        onLoad={() => setReady(true)}
        style={{ width: "100%", height: "100%", border: 0 }}
        title="Live preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

// --- Code panel ---

function CodePanel({ content, filename: _filename }: { content: string; filename: string }) {
  const lines = content.split("\n");

  if (!content) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
        }}
      >
        <div style={{ fontSize: 12, color: "#3f3f46" }}>
          Select a file to view its code
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto", background: "#09090b", padding: "12px 0" }}>
      <table style={{ borderSpacing: 0, width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} style={{ lineHeight: 1.6 }}>
              <td
                style={{
                  padding: "0 16px 0 12px",
                  userSelect: "none",
                  color: "#3f3f46",
                  fontSize: 11,
                  textAlign: "right",
                  minWidth: 40,
                  verticalAlign: "top",
                }}
              >
                {i + 1}
              </td>
              <td
                style={{
                  padding: "0 20px 0 0",
                  whiteSpace: "pre",
                  fontSize: 12,
                  color: "#e4e4e7",
                  verticalAlign: "top",
                }}
              >
                {line || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- File tree ---

type FileTreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
};

function buildFileTree(files: Record<string, string>): FileTreeNode {
  const root: FileTreeNode = { name: "", path: "", isDir: true, children: [] };
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

function renderFileTree(
  node: FileTreeNode,
  depth: number,
  selectedFile: string | null,
  onSelect: (p: string) => void,
  expandedDirs: Set<string>,
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>,
  files: Record<string, string>
): React.ReactNode {
  if (node.path === "") {
    return (node.children ?? []).map((c) =>
      renderFileTree(c, depth, selectedFile, onSelect, expandedDirs, setExpanded, files)
    );
  }

  const indent = depth * 12;
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = node.path === selectedFile;

  if (node.isDir) {
    return (
      <div key={node.path}>
        <button
          onClick={() =>
            setExpanded((prev) => {
              const next = new Set(prev);
              next.has(node.path) ? next.delete(node.path) : next.add(node.path);
              return next;
            })
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            width: "100%",
            textAlign: "left",
            paddingLeft: indent + 10,
            paddingTop: 4,
            paddingBottom: 4,
            paddingRight: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#71717a",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 9, opacity: 0.6 }}>{isExpanded ? "▼" : "▶"}</span>
          <span>📁</span>
          <span style={{ fontWeight: 600 }}>{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {(node.children ?? []).map((c) =>
              renderFileTree(c, depth + 1, selectedFile, onSelect, expandedDirs, setExpanded, files)
            )}
          </div>
        )}
      </div>
    );
  }

  const isNew = !!files[node.path] && Object.keys(files).slice(-3).includes(node.path);
  const ext = node.name.split(".").pop() ?? "";
  const fileIcon =
    ({ html: "🌐", css: "🎨", js: "⚡", ts: "🔷", tsx: "🧩", json: "📋", prisma: "🗄", md: "📝" } as Record<string, string>)[ext] ?? "📄";

  return (
    <button
      key={node.path}
      onClick={() => onSelect(node.path)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        width: "100%",
        textAlign: "left",
        paddingLeft: indent + 10,
        paddingTop: 4,
        paddingBottom: 4,
        paddingRight: 8,
        border: "none",
        borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent",
        background: isSelected ? "rgba(99,102,241,0.1)" : "transparent",
        cursor: "pointer",
        color: isSelected ? "#a5b4fc" : "#a1a1aa",
        fontSize: 12,
        fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      <span>{fileIcon}</span>
      <span style={{ flex: 1 }}>{node.name}</span>
      {isNew && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22c55e",
            flexShrink: 0,
            animation: "pulse 1s ease-in-out 2",
          }}
        />
      )}
    </button>
  );
}

// --- Quality badge ---

function QualityBadge({ score, ff }: { score: number; ff: string }) {
  const color =
    score >= 90
      ? "#22c55e"
      : score >= 75
      ? "#6366f1"
      : score >= 60
      ? "#f59e0b"
      : "#ef4444";
  const label =
    score >= 90 ? "Enterprise" : score >= 75 ? "Production" : score >= 60 ? "Review" : "Issues";

  return (
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
        border: `1px solid ${color}44`,
        background: `${color}11`,
        fontFamily: ff,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
        <circle cx="14" cy="14" r="11" fill="none" stroke="#27272a" strokeWidth="2.5" />
        <circle
          cx="14"
          cy="14"
          r="11"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={`${(score / 100) * 69} 69`}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
        />
      </svg>
      <span style={{ fontWeight: 900, fontSize: 12, color }}>{score}</span>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// --- Micro components ---

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#22c55e" fillOpacity="0.15" />
      <path
        d="M5 8l2 2 4-4"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, size / 8)}px solid #3f3f46`,
        borderTopColor: "#6366f1",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// --- Utils ---

function isPreviewable(path: string): boolean {
  return path.endsWith(".html");
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
