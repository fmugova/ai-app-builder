"use client";
// components/preview/PreviewHub.tsx
// Main entry point for the project preview system.
// Decides between Fast Preview (WebContainer) and Full Preview (Vercel deploy).
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { scanProject, type ScanResult } from "@/preview/scan";
import { PreviewModeSwitcher } from "./PreviewModeSwitcher";
import { DeployProgress } from "./DeployProgress";
import { OnboardingWizardModal } from "@/components/onboarding/OnboardingWizardModal";

// Dynamic import — WebContainerPreview must not run on SSR
const WebContainerPreview = dynamic(
  () => import("./WebContainerPreview").then(m => ({ default: m.WebContainerPreview })),
  { ssr: false, loading: () => <LoadingShell label="Initialising Fast Preview…" /> }
);

interface Props {
  projectId: string;
  /** If true, Full Preview is always shown (skips Fast Preview entirely) */
  forceFullPreview?: boolean;
}

type LoadState = "idle" | "loading" | "ready" | "error";
type PreviewMode = "fast" | "full";

interface GitHubVercelStatus {
  githubConnected: boolean;
  vercelConnected: boolean;
}

export function PreviewHub({ projectId, forceFullPreview = false }: Props) {
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [mode, setMode] = useState<PreviewMode | null>(null);
  const [patchNotes] = useState<string[]>([]); // populated by WebContainerPreview internally

  // Onboarding / deploy state
  const [intStatus, setIntStatus] = useState<GitHubVercelStatus | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deploySettings, setDeploySettings] = useState<{ repoName: string; privateRepo: boolean } | null>(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);

  const ff = "'IBM Plex Mono',ui-monospace,monospace";

  // ── Load project files ──────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { id: string; files: Record<string, string>; count: number } = await res.json();
      setFiles(data.files);
      const result = scanProject(data.files);
      setScan(result);

      if (forceFullPreview) {
        setMode("full");
      } else {
        setMode(result.recommended);
      }
      setLoadState("ready");
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load project files");
      setLoadState("error");
    }
  }, [projectId, forceFullPreview]);

  // ── Load integration status ─────────────────────────────────────────────
  const loadIntStatus = useCallback(async () => {
    try {
      const [ghRes, vcRes] = await Promise.all([
        fetch("/api/integrations/github/status", { cache: "no-store" }).catch(() => null),
        fetch("/api/integrations/vercel/status", { cache: "no-store" }).catch(() => null),
      ]);
      const ghData = ghRes?.ok ? await ghRes.json() : {};
      const vcData = vcRes?.ok ? await vcRes.json() : {};
      setIntStatus({
        githubConnected: !!ghData.connected,
        vercelConnected: !!vcData.connected,
      });
    } catch {
      setIntStatus({ githubConnected: false, vercelConnected: false });
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadIntStatus();
  }, [loadFiles, loadIntStatus]);

  // ── Deploy trigger ──────────────────────────────────────────────────────
  function handleDeployClick() {
    if (!intStatus?.githubConnected || !intStatus?.vercelConnected) {
      setShowOnboarding(true);
    } else {
      setShowDeploy(true);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (loadState === "idle" || loadState === "loading") {
    return <LoadingShell label="Loading project files…" />;
  }

  if (loadState === "error") {
    return (
      <div style={{ padding: 24, fontFamily: ff, color: "#ef4444", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Failed to load preview</div>
        <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 16 }}>{loadError}</div>
        <button onClick={loadFiles} style={pBtn}>Retry</button>
      </div>
    );
  }

  if (!files || !scan || !mode) return null;

  const defaultRepoName = `project-${projectId.slice(0, 8)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* Mode switcher */}
      <PreviewModeSwitcher
        scan={scan}
        selected={mode}
        onSelect={setMode}
        patchNotes={patchNotes}
      />

      {/* Fast Preview — WebContainer */}
      {mode === "fast" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <WebContainerPreview
            projectId={projectId}
            initialFiles={files}
            onFastFailed={() => setMode("full")}
          />
        </div>
      )}

      {/* Full Preview — deploy to Vercel */}
      {mode === "full" && !showDeploy && !fullPreviewUrl && (
        <FullPreviewPrompt
          scan={scan}
          intStatus={intStatus}
          onDeploy={handleDeployClick}
          ff={ff}
        />
      )}

      {mode === "full" && showDeploy && !fullPreviewUrl && (
        <DeployProgress
          projectId={projectId}
          repoName={deploySettings?.repoName ?? defaultRepoName}
          privateRepo={deploySettings?.privateRepo ?? true}
          onReady={(url) => { setFullPreviewUrl(url); setShowDeploy(false); }}
          onCancel={() => setShowDeploy(false)}
        />
      )}

      {mode === "full" && fullPreviewUrl && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a href={fullPreviewUrl} target="_blank" rel="noreferrer" style={{ ...pBtn, textDecoration: "none" }}>
              Open Full Preview →
            </a>
            <button onClick={() => navigator.clipboard?.writeText(fullPreviewUrl)} style={gBtn}>
              Copy URL
            </button>
            <button onClick={() => { setFullPreviewUrl(null); setShowDeploy(true); }} style={gBtn}>
              ↺ Redeploy
            </button>
          </div>
          <iframe
            src={fullPreviewUrl}
            style={{ flex: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, width: "100%", minHeight: 480 }}
            title="Full Preview"
            allow="fullscreen"
          />
        </div>
      )}

      {/* Onboarding wizard */}
      <OnboardingWizardModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        projectId={projectId}
        initialRepoName={defaultRepoName}
        onGitHubConnected={() => {
          loadIntStatus();
        }}
        onVercelConnected={() => {
          loadIntStatus();
        }}
        onSettingsConfirmed={(s) => {
          setDeploySettings(s);
          setShowOnboarding(false);
          setShowDeploy(true);
        }}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FullPreviewPrompt({
  scan,
  intStatus,
  onDeploy,
  ff,
}: {
  scan: ScanResult;
  intStatus: GitHubVercelStatus | null;
  onDeploy: () => void;
  ff: string;
}) {
  const bothConnected = intStatus?.githubConnected && intStatus?.vercelConnected;

  return (
    <div style={{ padding: 24, fontFamily: ff, color: "#e5e7eb", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "#0f1117" }}>
      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>Full Preview</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
        {scan.detected.nativeDeps.length > 0
          ? "This project uses native dependencies that can't run in-browser. Deploy to Vercel for a real live preview."
          : "Deploy your project to Vercel for a shareable live URL with real environment variables."}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <IntegrationBadge label="GitHub" connected={!!intStatus?.githubConnected} />
        <IntegrationBadge label="Vercel" connected={!!intStatus?.vercelConnected} />
      </div>

      <button onClick={onDeploy} style={pBtn}>
        {bothConnected ? "🚀 Deploy to Vercel" : "🔗 Connect & Deploy"}
      </button>
    </div>
  );
}

function IntegrationBadge({ label, connected }: { label: string; connected: boolean }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11,
      border: `1px solid ${connected ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
      color: connected ? "#34d399" : "#6b7280",
      background: connected ? "rgba(16,185,129,0.06)" : "transparent",
    }}>
      {connected ? "✓" : "○"} {label}
    </span>
  );
}

function LoadingShell({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, fontFamily: "'IBM Plex Mono',ui-monospace,monospace", color: "#6b7280", fontSize: 13 }}>
      <span style={{ marginRight: 10, opacity: 0.6 }}>⏳</span>
      {label}
    </div>
  );
}

const pBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" };
const gBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "inherit" };
