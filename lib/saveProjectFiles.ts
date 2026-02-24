// lib/saveProjectFiles.ts
// Persists generated files to the ProjectFile table via Prisma.
// Called after /api/generate/save creates the parent Project record.
//
// Uses upsert on the unique [projectId, path] constraint so calling it
// a second time (e.g. on retry/regenerate) replaces rather than duplicates.

import prisma from "@/lib/prisma";

// Derive a language tag from the file extension for the editor / syntax highlighting
function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    prisma: "prisma",
    sql: "sql",
    env: "plaintext",
    txt: "plaintext",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
  };
  return map[ext] ?? "plaintext";
}

/**
 * Upserts all files for a project into the ProjectFile table.
 *
 * @param projectId - The Prisma Project.id to attach files to
 * @param files     - Flat map of { "index.html": "...", "style.css": "..." }
 * @returns         - Number of files saved
 */
export async function saveProjectFiles(
  projectId: string,
  files: Record<string, string>
): Promise<number> {
  const entries = Object.entries(files);
  if (entries.length === 0) return 0;

  // Upsert in parallel — the unique constraint on [projectId, path] prevents duplicates
  await Promise.all(
    entries.map(([path, content], index) =>
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId, path } },
        create: {
          projectId,
          path,
          content,
          language: languageFromPath(path),
          order: index,
        },
        update: {
          content,
          language: languageFromPath(path),
          order: index,
          updatedAt: new Date(),
        },
      })
    )
  );

  return entries.length;
}

/**
 * Loads all files for a project from the ProjectFile table.
 * Returns a flat map of { "index.html": "...", "style.css": "..." }
 * Private files (path starts with "_") are excluded.
 */
export async function loadProjectFiles(
  projectId: string
): Promise<Record<string, string>> {
  const rows = await prisma.projectFile.findMany({
    where: { projectId },
    select: { path: true, content: true },
    orderBy: { order: 'asc' },
  });

  return Object.fromEntries(
    rows.filter((r) => !r.path.startsWith('_')).map((r) => [r.path, r.content])
  );
}
