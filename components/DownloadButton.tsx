"use client";
// components/DownloadButton.tsx
// Bundles all generated project files into a ZIP and triggers a browser download.
// Replaces the broken single-file "Download Files" button.

import { useState } from "react";
import { downloadProjectZip } from "@/lib/downloadProjectZip";

interface Props {
  files: Record<string, string>;
  projectName: string;
  /** Passed through from the parent so the button matches the surrounding font */
  ff?: string;
  style?: React.CSSProperties;
}

export function DownloadButton({ files, projectName, ff, style }: Props) {
  const [state, setState] = useState<"idle" | "zipping" | "done">("idle");
  const fileCount = Object.keys(files).length;

  async function handleClick() {
    if (fileCount === 0 || state === "zipping") return;
    setState("zipping");
    try {
      await downloadProjectZip(files, projectName);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }

  const label =
    state === "zipping"
      ? "Zipping…"
      : state === "done"
      ? "✓ Downloaded"
      : `↓ Download ZIP`;

  return (
    <button
      onClick={handleClick}
      disabled={fileCount === 0 || state === "zipping"}
      style={{
        padding: "7px 0",
        borderRadius: 8,
        border: "1px solid #3f3f46",
        background: state === "done" ? "rgba(34,197,94,0.1)" : "transparent",
        color:
          fileCount === 0
            ? "#3f3f46"
            : state === "done"
            ? "#22c55e"
            : "#a1a1aa",
        cursor: fileCount === 0 ? "default" : "pointer",
        fontSize: 12,
        fontFamily: ff ?? "inherit",
        fontWeight: state === "done" ? 700 : 500,
        transition: "all 0.15s",
        ...style,
      }}
    >
      {label}
    </button>
  );
}
