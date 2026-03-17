// app/api/generate/save/route.ts
// Saves a completed multi-page HTML generation to the database.
// Called client-side from GenerationExperience after the SSE "done" event fires.
//
// Split from /api/generate/stream so the stream route can use Edge runtime
// (no Vercel timeout) while DB writes stay on Node.js runtime (Prisma requires it).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { saveProjectFiles } from "@/lib/saveProjectFiles";
import { autoDetectAndSaveApiEndpoints, createNextjsPagesFromFiles } from "@/lib/autoDetectEndpoints";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findFirst({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  let body: {
    name: string;
    prompt: string;
    files: Record<string, string>;
    qualityScore: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, prompt, files, qualityScore } = body;
  if (!name || !files || typeof qualityScore !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Input validation ────────────────────────────────────────────────────────

  // Guard against oversized payloads (50 MB total across all files)
  const totalSize = Object.values(files).reduce((sum, c) => sum + (typeof c === 'string' ? c.length : 0), 0);
  if (totalSize > 50_000_000) {
    return NextResponse.json({ error: "Generated project exceeds maximum allowed size" }, { status: 413 });
  }

  // Sanitize file paths — strip any entry that tries to traverse directories
  // or that isn't a clean relative path. This prevents accidental DB storage of
  // malformed paths that could confuse downstream route generation.
  const SAFE_PATH_RE = /^[a-zA-Z0-9_\-/.@]+$/;
  const sanitizedFiles: Record<string, string> = {};
  for (const [rawPath, content] of Object.entries(files)) {
    const p = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');  // normalise slashes
    if (p.includes('..') || p.includes('//') || !SAFE_PATH_RE.test(p)) continue; // skip malformed
    if (typeof content !== 'string') continue;
    sanitizedFiles[p] = content;
  }
  const safeFiles = sanitizedFiles;

  try {
    const isNextjsProject = Object.keys(safeFiles).some(
      (p) => p.endsWith(".tsx") || (p.endsWith(".ts") && !p.endsWith(".d.ts") && !p.endsWith("route.ts"))
    );
    const isReactSpaProject = !isNextjsProject && (
      "vite.config.js" in safeFiles || "src/main.jsx" in safeFiles || "src/App.jsx" in safeFiles
    );
    const htmlFiles = Object.entries(safeFiles).filter(([p]) => p.endsWith(".html") && p !== "_preview/index.html");
    const combinedHtml = safeFiles["index.html"] ?? htmlFiles[0]?.[1] ?? "";

    // Resolve app URL upfront — needed inside the transaction for Page content replacement
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow-ai.app').replace(/\/$/, '')

    // Helper: replace BUILDFLOW_PROJECT_ID + upgrade relative API paths for a given file.
    // All relative /api/ paths become absolute so they work on external hosts
    // (Netlify, GitHub Pages, custom domains) that don't run the BuildFlow backend.
    // Covers every pattern: fetch('/api/...'), action="/api/...", href="/api/..."
    function applyPlaceholders(content: string, projectId: string, isHtml = true): string {
      let out = content.replaceAll("BUILDFLOW_PROJECT_ID", projectId)
      if (isHtml) {
        // Rewrite relative /api/ to absolute URL so forms and fetch() calls work
        // when the site is served from Netlify, GitHub Pages, or a custom domain.
        // Patterns covered:
        //   fetch('/api/...')   action="/api/..."   href='/api/...'
        //   fetch(`/api/...`)   action=/api/...
        out = out.replace(/(['"`])\/(api\/)/g, `$1${appUrl}/$2`)         // quoted
        out = out.replace(/(action|href|src)=\/(api\/)/g, `$1=${appUrl}/$2`) // unquoted HTML attrs
      }
      return out
    }

    // Pre-generate the project ID so Page creates can reference it without
    // an interactive transaction (interactive transactions are incompatible
    // with Supabase's pgbouncer in transaction-pool mode).
    const projectId = crypto.randomUUID();

    // Build page creates upfront (HTML projects only)
    const pageCreates = htmlFiles.map(([filename, rawContent], pi) => {
      const slug = filename.replace(".html", "") || "index";
      const content = applyPlaceholders(rawContent, projectId, true);

      const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const metaDescMatch =
        content.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
        content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const pMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

      const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      const h1Text = h1Match ? h1Match[1].replace(/<[^>]*>/g, "").trim() : "";
      const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";
      const pText = pMatch ? pMatch[1].replace(/<[^>]*>/g, "").trim().slice(0, 160) : "";
      const pageTitle =
        rawTitle ||
        h1Text ||
        (slug === "index" ? name : slug.charAt(0).toUpperCase() + slug.slice(1));

      return prisma.page.create({
        data: {
          projectId,
          slug,
          title: pageTitle,
          content,
          description: pText || metaDesc || null,
          metaTitle: pageTitle,
          metaDescription: metaDesc || pText || null,
          isHomepage: slug === "index",
          order: pi,
          isPublished: true,
        },
      });
    });

    // Use the array form of $transaction — compatible with pgbouncer transaction-pool mode.
    // All operations are pre-built so no interactive callback is needed.
    const [project] = await prisma.$transaction([
      prisma.project.create({
        data: {
          id: projectId,
          userId: dbUser.id,
          name,
          prompt,
          type: isNextjsProject ? "nextjs" : isReactSpaProject ? "react-spa" : "html",
          projectType: isNextjsProject ? "nextjs" : isReactSpaProject ? "react-spa" : "multi-page-html",
          code: combinedHtml,
          html: combinedHtml,
          css: files["style.css"] ?? "",
          javascript: files["script.js"] ?? "",
          multiPage: isNextjsProject || isReactSpaProject ? true : htmlFiles.length > 1,
          isMultiFile: isNextjsProject || isReactSpaProject,
          validationScore: BigInt(Math.round(qualityScore)),
          validationPassed: qualityScore >= 70,
          status: "DRAFT",
        },
      }),
      ...pageCreates,
    ]);

    // Replace the BUILDFLOW_PROJECT_ID placeholder injected during generation
    // with the real project id so contact forms POST to the correct endpoint.
    // Also rewrite relative /api/ paths to absolute URLs so forms work when
    // the site is published to Netlify or downloaded and opened locally.
    const injectedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(safeFiles)) {
      injectedFiles[path] = applyPlaceholders(content, project.id, path.endsWith('.html') || path.endsWith('.js'));
    }

    // Save all individual files to ProjectFile table
    await saveProjectFiles(project.id, injectedFiles);

    if (isNextjsProject) {
      // Create Page records from app/**/page.tsx files so the Pages + SEO dashboard sections work
      await createNextjsPagesFromFiles(project.id, injectedFiles).catch((err) =>
        console.error('[generate/save] createNextjsPagesFromFiles failed:', err)
      );
    }

    // Auto-detect and save API endpoint records from generated route files (both HTML & Next.js)
    await autoDetectAndSaveApiEndpoints(project.id).catch((err) =>
      console.error('[generate/save] autoDetectAndSaveApiEndpoints failed:', err)
    );

    // Return both projectId and injected files so the client can update
    // its in-memory state (preview + download will use the real endpoint).
    return NextResponse.json({ projectId: project.id, files: injectedFiles });
  } catch (err) {
    const prismaCode = (err as { code?: string })?.code;
    const prismaMsg = (err as { message?: string })?.message ?? String(err);
    console.error("[generate/save] DB save failed:", prismaCode, prismaMsg);
    // Return generic client error — never expose raw Prisma messages to the browser
    return NextResponse.json({ error: "Failed to save project. Please try again." }, { status: 500 });
  }
}
