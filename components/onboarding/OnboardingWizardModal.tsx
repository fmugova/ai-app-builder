"use client";
// components/onboarding/OnboardingWizardModal.tsx
import React, { useState } from "react";

type Step = "github" | "vercel" | "repo";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onGitHubConnected: () => void;
  onVercelConnected: () => void;
  initialRepoName?: string;
  onSettingsConfirmed?: (s: { repoName: string; privateRepo: boolean }) => void;
}

export function OnboardingWizardModal({ open, onClose, projectId, onGitHubConnected, onVercelConnected, initialRepoName, onSettingsConfirmed }: Props) {
  const [step, setStep] = useState<Step>("github");
  const [githubDone, setGithubDone] = useState(false);
  const [vercelDone, setVercelDone] = useState(false);
  const [repoName, setRepoName] = useState(initialRepoName ?? `buildflow-project-${projectId.slice(0, 6)}`);
  const [privateRepo, setPrivateRepo] = useState(true);

  if (!open) return null;

  const steps = [
    { id: "github", title: "Connect GitHub", done: githubDone },
    { id: "vercel", title: "Connect Vercel", done: vercelDone },
    { id: "repo", title: "Repository", done: false },
  ];
  const ff = "'IBM Plex Mono',ui-monospace,monospace";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 50 }}>
      <div style={{ width: "min(640px,94vw)", borderRadius: 20, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", padding: 20, fontFamily: ff, color: "#e5e7eb", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Set up Full Preview</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Connect GitHub + Vercel to deploy your generated app</div>
          </div>
          <button onClick={onClose} style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", padding: "6px 10px", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 14, fontFamily: ff }}>✕</button>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => {
                  if (i === 0) setStep("github");
                  if (i === 1 && githubDone) setStep("vercel");
                  if (i === 2 && githubDone && vercelDone) setStep("repo");
                }}
                style={{ flex: 1, padding: "8px 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: ff }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${step === s.id ? "#7c3aed" : s.done ? "#10b981" : "rgba(255,255,255,0.15)"}`, background: step === s.id ? "rgba(124,58,237,0.2)" : s.done ? "rgba(16,185,129,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: step === s.id ? "#a78bfa" : s.done ? "#34d399" : "#6b7280" }}>
                    {s.done ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: step === s.id ? "#a78bfa" : s.done ? "#34d399" : "#6b7280", fontWeight: step === s.id ? 800 : 600 }}>{s.title}</div>
                </div>
              </button>
              {i < steps.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", paddingBottom: 20 }}>
                  <div style={{ width: 32, height: 1, background: githubDone && i === 0 ? "#10b981" : "rgba(255,255,255,0.1)" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ minHeight: 200 }}>
          {step === "github" && (
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>🐙</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Connect GitHub</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3, lineHeight: 1.5 }}>Buildflow will create a new repository and push your generated code. We request only the permissions needed.</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#10b981", marginBottom: 5, textTransform: "uppercase" as const }}>We will</div>
                  {["Create repositories on your behalf", "Push commits to the created repository", "Read repository metadata"].map(item => (
                    <div key={item} style={{ fontSize: 11, color: "#6ee7b7" }}>✓ {item}</div>
                  ))}
                </div>
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", marginBottom: 5, textTransform: "uppercase" as const }}>We will not</div>
                  {["Access your private repositories", "Modify any existing repositories"].map(item => (
                    <div key={item} style={{ fontSize: 11, color: "#6b7280" }}>✕ {item}</div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => window.location.href = `/api/integrations/github/connect?returnTo=/dashboard/projects/${projectId}`} style={pBtn}>Connect GitHub →</button>
                <button onClick={() => { setGithubDone(true); onGitHubConnected(); setStep("vercel"); }} style={gBtn}>Already connected</button>
              </div>
            </div>
          )}

          {step === "vercel" && (
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>▲</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Connect Vercel</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3, lineHeight: 1.5 }}>We&apos;ll deploy your GitHub repository to Vercel and generate a shareable Full Preview link automatically.</div>
                </div>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", fontSize: 11, color: "#a78bfa" }}>
                ℹ Works with Personal accounts and Teams.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => setStep("github")} style={gBtn}>← Back</button>
                <button onClick={() => window.location.href = `/api/integrations/vercel/connect?returnTo=/dashboard/projects/${projectId}`} style={pBtn}>Connect Vercel →</button>
                <button onClick={() => { setVercelDone(true); onVercelConnected(); setStep("repo"); }} style={gBtn}>Already connected</button>
              </div>
            </div>
          )}

          {step === "repo" && (
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>📦</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Repository settings</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3, lineHeight: 1.5 }}>Choose where Buildflow publishes your generated project.</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block" }}>
                  Repository name
                  <input
                    value={repoName}
                    onChange={e => setRepoName(e.target.value)}
                    placeholder="buildflow-my-app"
                    style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#e5e7eb", fontFamily: ff, fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                  />
                  <span style={{ fontSize: 10, color: "#4b5563", marginTop: 4, display: "block" }}>Must be unique in your GitHub account</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={privateRepo} onChange={e => setPrivateRepo(e.target.checked)} style={{ accentColor: "#7c3aed" }} />
                  <span style={{ fontSize: 12 }}>Make repository private <span style={{ color: "#6b7280", fontSize: 11 }}>(recommended)</span></span>
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => setStep("vercel")} style={gBtn}>← Back</button>
                <button onClick={() => { onSettingsConfirmed?.({ repoName, privateRepo }); onClose(); }} disabled={!repoName.trim()} style={{ ...pBtn, opacity: !repoName.trim() ? 0.5 : 1 }}>Finish & Deploy →</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#6b7280" }}>
          🔒 Buildflow only uploads the code generated for this project.
        </div>
      </div>
    </div>
  );
}

const pBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" };
const gBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "inherit" };
