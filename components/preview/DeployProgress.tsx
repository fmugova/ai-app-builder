"use client";
// components/preview/DeployProgress.tsx
import React, { useEffect, useRef, useState } from "react";

export type DeployStepId = "createRepo" | "pushCode" | "triggerVercel" | "waitForReady";
export type StepStatus = "idle" | "running" | "success" | "error";

interface StepState { id: DeployStepId; title: string; description: string; status: StepStatus; detail?: string; }

type DeployJobState =
  | { status: "running"; step: DeployStepId; message?: string; repoUrl?: string; vercelDeploymentUrl?: string; vercelLogsUrl?: string }
  | { status: "success"; repoUrl?: string; vercelDeploymentUrl: string; vercelLogsUrl?: string }
  | { status: "error"; step?: DeployStepId; message: string; repoUrl?: string; vercelLogsUrl?: string };

interface Props { projectId: string; repoName?: string; privateRepo?: boolean; onReady?: (url: string) => void; onCancel?: () => void; }

const STEP_ORDER: Record<DeployStepId, number> = { createRepo: 0, pushCode: 1, triggerVercel: 2, waitForReady: 3 };

const INITIAL_STEPS: StepState[] = [
  { id: "createRepo", title: "Creating GitHub repository", description: "Buildflow pushes your generated code to a new repo.", status: "idle" },
  { id: "pushCode", title: "Pushing code", description: "Commits all project files and pushes to GitHub.", status: "idle" },
  { id: "triggerVercel", title: "Triggering Vercel deployment", description: "Vercel detects the push and starts building.", status: "idle" },
  { id: "waitForReady", title: "Waiting for deployment", description: "Build completes — your live preview URL becomes available.", status: "idle" },
];

const FIX_HINTS: Record<DeployStepId, string[]> = {
  createRepo: ["Check GitHub permissions — your account must allow repo creation.", "If using a GitHub org, an admin may need to approve the integration.", "Try a different repo name if one already exists."],
  pushCode: ["Reconnect GitHub if your token was revoked.", "Check for branch protection rules that may block pushes.", "Retry with a fresh repository name."],
  triggerVercel: ["Verify Vercel connection and scope (Personal or Team).", "Check that Vercel has access to private GitHub repos.", "Disconnect and reconnect Vercel to refresh permissions."],
  waitForReady: ["Open build logs to see the exact error.", "Missing environment variables are the most common cause.", "For Prisma/Supabase apps, confirm DATABASE_URL and Supabase keys are set."],
};

export function DeployProgress({ projectId, repoName, privateRepo = true, onReady, onCancel }: Props) {
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [jobId, setJobId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string>();
  const [vercelUrl, setVercelUrl] = useState<string>();
  const [logsUrl, setLogsUrl] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reset() {
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: "idle" as const })));
    setJobId(null); setRunning(false);
    setRepoUrl(undefined); setVercelUrl(undefined); setLogsUrl(undefined); setError(null);
  }

  function updateSteps(currentStep: DeployStepId, status: StepStatus, detail?: string) {
    setSteps(prev => prev.map(s => {
      if (s.id === currentStep) return { ...s, status, detail };
      if (STEP_ORDER[s.id] < STEP_ORDER[currentStep] && s.status !== "error") return { ...s, status: "success" };
      return s;
    }));
  }

  async function start() {
    reset(); setRunning(true);
    try {
      const res = await fetch("/api/deploy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, repoName, privateRepo }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "") || `HTTP ${res.status}`);
      const data = await res.json();
      setJobId(data.jobId);
      updateSteps("createRepo", "running", "Starting…");
    } catch (e: any) {
      setRunning(false); setError(e?.message ?? "Failed to start");
      updateSteps("createRepo", "error", e?.message);
    }
  }

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/deploy/job?jobId=${encodeURIComponent(jobId!)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Poll HTTP ${res.status}`);
        const state: DeployJobState = await res.json();
        if (cancelled) return;
        if ("repoUrl" in state && state.repoUrl) setRepoUrl(state.repoUrl);
        if ("vercelLogsUrl" in state && state.vercelLogsUrl) setLogsUrl(state.vercelLogsUrl);
        if (state.status === "running") {
          updateSteps(state.step, "running", state.message);
          if (state.vercelDeploymentUrl) setVercelUrl(state.vercelDeploymentUrl);
        }
        if (state.status === "success") {
          setSteps(prev => prev.map(s => ({ ...s, status: "success" })));
          setRunning(false); setVercelUrl(state.vercelDeploymentUrl);
          onReady?.(state.vercelDeploymentUrl);
          clearInterval(pollRef.current!);
        }
        if (state.status === "error") {
          setRunning(false); setError(state.message);
          if (state.step) updateSteps(state.step, "error", state.message);
          clearInterval(pollRef.current!);
        }
      } catch (e: any) {
        if (!cancelled) { setRunning(false); setError(e?.message ?? "Polling failed"); clearInterval(pollRef.current!); }
      }
    }
    poll();
    pollRef.current = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(pollRef.current!); };
  }, [jobId]);

  const isSuccess = !running && !!vercelUrl && !error;
  const ff = "'IBM Plex Mono',ui-monospace,monospace";

  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "#0f1117", padding: 16, fontFamily: ff, color: "#e5e7eb" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Deploying to Vercel</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>GitHub repo → Vercel build → Live preview</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!jobId && <button onClick={start} style={pBtn}>🚀 Deploy</button>}
          {jobId && running && <button onClick={() => { onCancel?.(); }} style={gBtn}>Cancel</button>}
          {jobId && !running && <button onClick={start} style={gBtn}>↺ Redeploy</button>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <LinkPill href={repoUrl} pending="GitHub Repo" label="GitHub Repo" />
        <LinkPill href={vercelUrl} pending="Preview URL" label="Open Preview" accent />
        <LinkPill href={logsUrl} pending="Build Logs" label="Build Logs" />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {steps.map(step => (
          <div key={step.id} style={{ display: "flex", gap: 10, padding: 12, borderRadius: 10, border: `1px solid ${step.status === "error" ? "rgba(239,68,68,0.3)" : step.status === "success" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`, background: step.status === "error" ? "rgba(239,68,68,0.05)" : step.status === "success" ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)", transition: "all 0.2s" }}>
            <div style={{ width: 24, flexShrink: 0, paddingTop: 1 }}>
              {step.status === "idle" && <span style={{ opacity: 0.3 }}>○</span>}
              {step.status === "running" && <span>⏳</span>}
              {step.status === "success" && <span>✅</span>}
              {step.status === "error" && <span>❌</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: step.status === "idle" ? "#6b7280" : step.status === "error" ? "#ef4444" : "#e5e7eb" }}>{step.title}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{step.description}</div>
              {step.detail && <div style={{ fontSize: 11, marginTop: 4, color: step.status === "error" ? "#ef4444" : "#9ca3af" }}>{step.detail}</div>}
              {step.status === "error" && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "#9ca3af" }}>{FIX_HINTS[step.id].map((h, i) => <li key={i}>{h}</li>)}</ul>}
            </div>
          </div>
        ))}
      </div>

      {error && !isSuccess && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontWeight: 900, color: "#ef4444", fontSize: 13 }}>Deployment failed</div>
          <div style={{ fontSize: 12, marginTop: 4, color: "#fca5a5" }}>{error}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={start} style={pBtn}>Retry</button>
            {logsUrl && <a href={logsUrl} target="_blank" rel="noreferrer" style={{ ...gBtn, textDecoration: "none", display: "inline-block" }}>Open Logs</a>}
          </div>
        </div>
      )}
      {isSuccess && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <div style={{ fontWeight: 900, color: "#10b981", fontSize: 13 }}>✅ Full Preview ready</div>
          <div style={{ fontSize: 11, color: "#6ee7b7", marginTop: 4 }}>{vercelUrl}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <a href={vercelUrl} target="_blank" rel="noreferrer" style={{ ...pBtn, textDecoration: "none", display: "inline-block" }}>Open Preview</a>
            <button onClick={() => navigator.clipboard?.writeText(vercelUrl!)} style={gBtn}>Copy Link</button>
            {repoUrl && <a href={repoUrl} target="_blank" rel="noreferrer" style={{ ...gBtn, textDecoration: "none", display: "inline-block" }}>View Repo</a>}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkPill({ href, pending, label, accent }: { href?: string; pending: string; label: string; accent?: boolean }) {
  const s: React.CSSProperties = { borderRadius: 20, border: `1px solid ${href ? (accent ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.06)"}`, padding: "4px 10px", fontSize: 11, textDecoration: "none", color: href ? (accent ? "#34d399" : "#9ca3af") : "#4b5563", background: href && accent ? "rgba(16,185,129,0.08)" : "transparent", fontFamily: "inherit" };
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={s}>{label} →</a>;
  return <span style={s}>{pending} (pending)</span>;
}

const pBtn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "none", background: "#7c3aed", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" };
const gBtn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "inherit" };
