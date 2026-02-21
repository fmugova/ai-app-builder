"use client";
// components/preview/PreviewModeSwitcher.tsx
import React from "react";
import type { ScanResult } from "@/preview/scan";

interface SwitcherProps {
  scan: ScanResult;
  selected: "fast" | "full";
  onSelect: (m: "fast" | "full") => void;
  patchNotes?: string[];
}

export function PreviewModeSwitcher({ scan, selected, onSelect, patchNotes }: SwitcherProps) {
  const isFastRec = scan.recommended === "fast";
  const ff = "'IBM Plex Mono',ui-monospace,monospace";
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "#0f1117", padding: 14, fontFamily: ff }}>
      <div style={{ display: "flex", gap: 10 }}>
        <ModeBtn icon="⚡" label="Fast Preview" sub="In-browser, instant" active={selected === "fast"} rec={isFastRec} badge={scan.detected.prisma ? "DB mocked" : undefined} badgeColor="#f59e0b" onClick={() => onSelect("fast")} />
        <ModeBtn icon="🚀" label="Full Preview" sub="Real backend, Vercel" active={selected === "full"} rec={!isFastRec} onClick={() => onSelect("full")} />
      </div>
      {scan.reasons.length > 0 && (
        <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Why this recommendation</div>
          {scan.reasons.map((r, i) => <div key={i} style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>• {r}</div>)}
        </div>
      )}
      {scan.warnings.length > 0 && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          {scan.warnings.map((w, i) => <div key={i} style={{ fontSize: 11, color: "#d97706" }}>⚠ {w}</div>)}
        </div>
      )}
      {selected === "fast" && patchNotes && patchNotes.length > 0 && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Fast Preview patches applied</div>
          {patchNotes.map((n, i) => <div key={i} style={{ fontSize: 11, color: "#a78bfa", marginBottom: 2 }}>• {n}</div>)}
          <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>DB calls return mocked data. Use Full Preview for real backend.</div>
        </div>
      )}
    </div>
  );
}

function ModeBtn({ icon, label, sub, active, rec, badge, badgeColor, onClick }: { icon: string; label: string; sub: string; active: boolean; rec: boolean; badge?: string; badgeColor?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: active ? "1.5px solid rgba(139,92,246,0.6)" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", position: "relative" }}>
      {rec && <div style={{ position: "absolute", top: -8, right: 8, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: active ? "#8b5cf6" : "rgba(139,92,246,0.5)", color: "white", textTransform: "uppercase" }}>Recommended</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: active ? "#e5e7eb" : "#9ca3af" }}>{label}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>{sub}</div>
        </div>
        {badge && <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44`, fontWeight: 700 }}>{badge}</span>}
      </div>
    </button>
  );
}
