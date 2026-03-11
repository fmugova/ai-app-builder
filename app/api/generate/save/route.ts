// app/api/generate/save/route.ts
// Saves a completed multi-page HTML generation to the database.
// Called client-side from GenerationExperience after the SSE "done" event fires.
//
// Split from /api/generate/stream so the stream route can use Edge runtime
// (no Vercel timeout) while DB writes stay on Node.js runtime (Prisma requires it).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

  const dbUser = await prisma.user.findUnique({
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

  try {
    const isNextjsProject = Object.keys(files).some(
      (p) => p.endsWith(".tsx") || (p.endsWith(".ts") && !p.endsWith(".d.ts") && !p.endsWith("route.ts"))
    );
    const htmlFiles = Object.entries(files).filter(([p]) => p.endsWith(".html"));
    const combinedHtml = files["index.html"] ?? htmlFiles[0]?.[1] ?? "";

    // Resolve app URL upfront — needed inside the transaction for Page content replacement
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow-ai.app').replace(/\/$/, '')

    // Helper: replace BUILDFLOW_PROJECT_ID + upgrade relative API paths for a given file
    function applyPlaceholders(content: string, projectId: string, isHtml = true): string {
      let out = content.replaceAll("BUILDFLOW_PROJECT_ID", projectId)
      if (isHtml) {
        out = out
          .replaceAll(`/api/projects/${projectId}/`, `${appUrl}/api/projects/${projectId}/`)
          .replaceAll(`/api/public/auth/${projectId}`, `${appUrl}/api/public/auth/${projectId}`)
      }
      return out
    }

    // Wrap Project + all Page creates in a single transaction so a partial
    // Page failure never leaves an orphaned Project record with no pages.
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          userId: dbUser.id,
          name,
          prompt,
          type: isNextjsProject ? "nextjs" : "html",
          projectType: isNextjsProject ? "nextjs" : "multi-page-html",
          code: combinedHtml,
          html: combinedHtml,
          css: files["style.css"] ?? "",
          javascript: files["script.js"] ?? "",
          multiPage: isNextjsProject ? true : htmlFiles.length > 1,
          isMultiFile: isNextjsProject,
          validationScore: BigInt(Math.round(qualityScore)),
          validationPassed: qualityScore >= 70,
          status: "DRAFT",
        },
      });

      for (let pi = 0; pi < htmlFiles.length; pi++) {
        const [filename, rawContent] = htmlFiles[pi];
        const slug = filename.replace(".html", "") || "index";
        // Apply placeholder replacement so Page records have real URLs (not BUILDFLOW_PROJECT_ID)
        const content = applyPlaceholders(rawContent, created.id, true)

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

        await tx.page.create({
          data: {
            projectId: created.id,
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
      }

      return created;
    });

    // Replace the BUILDFLOW_PROJECT_ID placeholder injected during generation
    // with the real project id so contact forms POST to the correct endpoint.
    // Also rewrite relative /api/ paths to absolute URLs so forms work when
    // the site is published to Netlify or downloaded and opened locally.
    const injectedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
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
    const clientMsg = prismaCode
      ? `Database error (${prismaCode}): ${prismaMsg.split('\n')[0]}`
      : `Database error: ${prismaMsg.split('\n')[0]}`;
    return NextResponse.json({ error: clientMsg }, { status: 500 });
  }
}
