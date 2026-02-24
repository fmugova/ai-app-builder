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
    const htmlFiles = Object.entries(files).filter(([p]) => p.endsWith(".html"));
    const combinedHtml = files["index.html"] ?? htmlFiles[0]?.[1] ?? "";

    const project = await prisma.project.create({
      data: {
        userId: dbUser.id,
        name,
        prompt,
        type: "html",
        projectType: "multi-page-html",
        code: combinedHtml,
        html: combinedHtml,
        css: files["style.css"] ?? "",
        javascript: files["script.js"] ?? "",
        multiPage: htmlFiles.length > 1,
        isMultiFile: false,
        validationScore: BigInt(Math.round(qualityScore)),
        validationPassed: qualityScore >= 70,
        status: "DRAFT",
      },
    });

    // Create Page records
    if (htmlFiles.length > 0) {
      for (let pi = 0; pi < htmlFiles.length; pi++) {
        const [filename, content] = htmlFiles[pi];
        const slug = filename.replace(".html", "") || "index";

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

        await prisma.page.create({
          data: {
            projectId: project.id,
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
    }

    // Replace the BUILDFLOW_PROJECT_ID placeholder injected during generation
    // with the real project id so contact forms POST to the correct endpoint.
    const injectedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      injectedFiles[path] = content.replaceAll("BUILDFLOW_PROJECT_ID", project.id);
    }

    // Save all individual files to ProjectFile table
    await saveProjectFiles(project.id, injectedFiles);

    // Return both projectId and injected files so the client can update
    // its in-memory state (preview + download will use the real endpoint).
    return NextResponse.json({ projectId: project.id, files: injectedFiles });
  } catch (err) {
    console.error("[generate/save] DB save failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
