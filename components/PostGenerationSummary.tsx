"use client";
// components/PostGenerationSummary.tsx
// Shown when generation completes — replaces the sparse "Done" state.
// Shows: quality score, download, publish live, and dashboard links.

import { useState } from "react";

interface Props {
  projectId: string;
  projectName: string;
  files: Record<string, string>;
  qualityScore: number;
  mode: "html" | "react-spa" | "nextjs";
  onDownload: () => Promise<void>;
}

type PublishStatus = "idle" | "publishing" | "done" | "error";

export function PostGenerationSummary({
  projectId,
  projectName,
  files,
  qualityScore,
  mode,
  onDownload,
}: Props) {
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const fileCount = Object.keys(files).filter((p) => !p.startsWith("_")).length;
  const htmlPageCount = Object.keys(files).filter((p) => p.endsWith(".html")).length;
  const isHtml = mode === "html";
  const ff = "'Geist Mono','IBM Plex Mono',ui-monospace,monospace";

  const scoreColor =
    qualityScore >= 90
      ? "#22c55e"
      : qualityScore >= 75
      ? "#6366f1"
      : qualityScore >= 60
      ? "#f59e0b"
      : "#ef4444";
  const scoreLabel =
    qualityScore >= 90
      ? "Enterprise Ready"
      : qualityScore >= 75
      ? "Production Ready"
      : qualityScore >= 60
      ? "Needs Review"
      : "Issues Found";

  // Circumference of a circle with r=12: 2πr ≈ 75.4
  const CIRCUMFERENCE = 75.4;

  async function handlePublish() {
    setPublishStatus("publishing");
    setPublishError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/publish/netlify`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setPublishedUrl(data.url);
      setPublishStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed";
      setPublishError(msg);
      setPublishStatus("error");
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Quality score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 10,
          background: `${scoreColor}0f`,
          border: `1px solid ${scoreColor}33`,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
          <circle cx="16" cy="16" r="12" fill="none" stroke="#27272a" strokeWidth="3" />
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={scoreColor}
            strokeWidth="3"
            strokeDasharray={`${(qualityScore / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
          />
        </svg>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: scoreColor }}>
            {qualityScore}/100 — {scoreLabel}
          </div>
          <div style={{ fontSize: 11, color: "#71717a", fontFamily: ff }}>
            {fileCount} files generated · {htmlPageCount} page{htmlPageCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Download */}
      <ActionRow
        icon="⬇"
        title="Download files"
        desc={
          isHtml
            ? `${fileCount} HTML/CSS/JS files — open in browser or deploy to Netlify`
            : `Complete ${mode === "nextjs" ? "Next.js" : "React"} project — npm install, add env vars, deploy`
        }
        buttonLabel={isDownloading ? "Zipping…" : "Download .zip"}
        buttonStyle={{ background: "#6366f1" }}
        onClick={handleDownload}
        disabled={isDownloading}
      />

      {/* Publish live (HTML only — requires NETLIFY_TOKEN) */}
      {isHtml && (
        <ActionRow
          icon="🌐"
          title="Publish live"
          desc={
            publishedUrl
              ? `Your site is live at ${publishedUrl}`
              : "Get a real sharable URL in ~15 seconds — powered by Netlify"
          }
          buttonLabel={
            publishStatus === "idle"
              ? "Publish to web"
              : publishStatus === "publishing"
              ? "Publishing…"
              : publishStatus === "done"
              ? "✓ Published!"
              : "Try again"
          }
          buttonStyle={{
            background:
              publishStatus === "done"
                ? "#22c55e"
                : publishStatus === "error"
                ? "#ef4444"
                : "#f97316",
          }}
          onClick={handlePublish}
          disabled={publishStatus === "publishing"}
          subContent={
            publishedUrl ? (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: "#22c55e",
                  fontFamily: ff,
                  wordBreak: "break-all",
                }}
              >
                {publishedUrl} ↗
              </a>
            ) : publishError ? (
              <span style={{ fontSize: 11, color: "#ef4444", fontFamily: ff }}>
                {publishError}
              </span>
            ) : null
          }
        />
      )}

      {/* Submissions dashboard */}
      <ActionRow
        icon="📬"
        title="Form submissions"
        desc="View contact form data and registered users from your live site"
        buttonLabel="Open dashboard"
        buttonStyle={{
          background: "transparent",
          border: "1px solid #3f3f46",
          color: "#a1a1aa",
        }}
        onClick={() =>
          window.open(`/dashboard/projects/${projectId}/submissions`, "_blank")
        }
      />

      {/* Honest dependency disclosure */}
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          fontSize: 11,
          color: "#92400e",
          fontFamily: ff,
          lineHeight: 1.5,
        }}
      >
        {isHtml ? (
          <>
            ⚠ Forms and auth on this site are powered by BuildFlow&apos;s servers.
            The design files work standalone; backend features require your BuildFlow account to be active.
          </>
        ) : (
          <>
            ℹ The downloaded code is a production-ready starting point.
            Add your DATABASE_URL and NEXTAUTH_SECRET, then run npm install to deploy.
          </>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  desc,
  buttonLabel,
  buttonStyle,
  onClick,
  disabled,
  subContent,
}: {
  icon: string;
  title: string;
  desc: string;
  buttonLabel: string;
  buttonStyle?: React.CSSProperties;
  onClick: () => void;
  disabled?: boolean;
  subContent?: React.ReactNode;
}) {
  const ff = "'Geist Mono','IBM Plex Mono',ui-monospace,monospace";
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        background: "#0f0f11",
        border: "1px solid #1c1c1e",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: subContent ? 8 : 0,
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fafafa", marginBottom: 2 }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "#71717a", fontFamily: ff, lineHeight: 1.4 }}>
            {desc}
          </div>
        </div>
        <button
          onClick={onClick}
          disabled={disabled}
          style={{
            padding: "6px 14px",
            borderRadius: 7,
            border: "none",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: ff,
            cursor: disabled ? "wait" : "pointer",
            flexShrink: 0,
            transition: "opacity 0.2s",
            opacity: disabled ? 0.6 : 1,
            ...buttonStyle,
          }}
        >
          {buttonLabel}
        </button>
      </div>
      {subContent}
    </div>
  );
}
