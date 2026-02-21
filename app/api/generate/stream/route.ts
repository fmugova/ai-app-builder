// app/api/generate/stream/route.ts
// SSE endpoint powering the GenerationExperience component.
// Streams: plan -> step_start -> file -> step_done -> quality -> done

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGenerationPlan } from "@/lib/api/planGeneration";
import { runGenerationPipeline } from "@/lib/pipeline/htmlGenerationPipeline";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for large projects

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prompt = req.nextUrl.searchParams.get("prompt") ?? "";
  const siteName = req.nextUrl.searchParams.get("name") ?? "My App";

  if (!prompt.trim()) {
    return new Response("Missing prompt", { status: 400 });
  }

  // Resolve user ID once (needed for DB save)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) {
    return new Response("User not found", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Client disconnected
        }
      }

      try {
        // 1. Generate plan (fast -- uses haiku, ~1s)
        const plan = await createGenerationPlan(prompt, siteName);
        send("plan", plan);

        // 2. Execute generation pipeline
        let stepIndex = 0;

        const result = await runGenerationPipeline(
          prompt,
          siteName,
          // onProgress: maps pipeline steps to SSE events
          (step, detail) => {
            const currentStep = plan.steps[stepIndex];
            if (!currentStep) return;

            if (
              step === "generating-styles" ||
              step.startsWith("generating-page")
            ) {
              send("step_start", { stepId: currentStep.id, label: currentStep.label });
            }

            // Log detail for debugging (not sent to client)
            if (detail) console.log(`[generate/stream] ${step}: ${detail}`);
          },
          // onFile: fires as each file is saved -- drives live file tree
          (path: string, content: string) => {
            send("file", { path, content });

            // Advance to next step when a file matches the current step's expected output
            const currentStep = plan.steps[stepIndex];
            if (currentStep) {
              const filename = path.split("/").pop() ?? path;
              const matchesStep = currentStep.files.some(
                (f) => f.endsWith(filename) || f.includes(filename)
              );
              if (matchesStep) {
                send("step_done", { stepId: currentStep.id });
                stepIndex = Math.min(stepIndex + 1, plan.steps.length - 1);
                // Pre-announce next step
                const nextStep = plan.steps[stepIndex];
                if (nextStep && nextStep.id !== currentStep.id) {
                  send("step_start", { stepId: nextStep.id });
                }
              }
            }
          }
        );

        // Mark any remaining steps as done
        for (let i = stepIndex; i < plan.steps.length; i++) {
          send("step_done", { stepId: plan.steps[i].id });
        }

        // 3. Quality score
        send("quality", { score: result.qualityScore });

        // 4. Save project + pages to DB
        let savedProjectId: string | undefined;
        try {
          const htmlFiles = Object.entries(result.files).filter(([p]) => p.endsWith(".html"));
          const combinedHtml = result.files["index.html"] ?? htmlFiles[0]?.[1] ?? "";

          const project = await prisma.project.create({
            data: {
              userId: dbUser.id,
              name: siteName,
              prompt,
              type: "html",
              projectType: "multi-page-html",
              code: combinedHtml,
              html: combinedHtml,
              css: result.files["style.css"] ?? "",
              javascript: result.files["script.js"] ?? "",
              multiPage: htmlFiles.length > 1,
              isMultiFile: false,
              validationScore: BigInt(result.qualityScore),
              validationPassed: result.qualityScore >= 70,
              status: "DRAFT",
            },
          });
          savedProjectId = project.id;

          // Create Page records for each HTML file
          if (htmlFiles.length > 0) {
            await prisma.page.deleteMany({ where: { projectId: project.id } });

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
              const pageTitle = rawTitle || h1Text || (slug === "index" ? siteName : slug.charAt(0).toUpperCase() + slug.slice(1));

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
        } catch (dbErr) {
          console.error("[generate/stream] DB save failed:", dbErr);
          // Non-fatal — still send done event
        }

        // 5. Done
        send("done", {
          files: result.files,
          qualityScore: result.qualityScore,
          pages: result.pages,
          warnings: result.warnings,
          projectId: savedProjectId,
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Generation failed";
        send("error_event", { message });
      } finally {
        closed = true;
        controller.close();
      }
    },

    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
