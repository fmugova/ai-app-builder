// lib/downloadProjectZip.ts
// Bundles all generated files into a ZIP and triggers browser download.
//
// Fixes the broken "Download Files" button that previously only exported index.html
// (a single 1300-line concatenation). This version preserves every file at its
// correct path inside the ZIP so the user can unzip and run it directly.

import JSZip from "jszip";

/**
 * Creates a ZIP of all project files and triggers a browser download.
 *
 * @param files  - Flat map of { "index.html": "...", "style.css": "..." }
 * @param projectName - Used as the ZIP filename (sanitized)
 */
export async function downloadProjectZip(
  files: Record<string, string>,
  projectName: string
): Promise<void> {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    // Normalize Windows backslashes just in case
    zip.file(path.replace(/\\/g, "/"), content);
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

  const safeName = projectName
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    || "project";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the download has started
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
