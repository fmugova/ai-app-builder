// app/api/generate/stream/route.ts
// SSE endpoint powering the GenerationExperience component.
// Streams: token -> plan -> step_start -> file -> step_done -> quality -> done
//
// Node.js runtime with maxDuration:300 — allows generation to run up to 5 minutes.
// Auth uses getToken (JWT-only, works in both Edge and Node runtimes).
// DB save is handled client-side via POST /api/generate/save after the done event.

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createGenerationPlan } from "@/lib/api/planGeneration";
import { runGenerationPipeline } from "@/lib/pipeline/htmlGenerationPipeline";

// Node.js runtime — vercel.json functions.maxDuration:300 applies here.
// Edge Runtime ignores the vercel.json functions config and caps at 30s.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prompt = req.nextUrl.searchParams.get("prompt") ?? "";
  const siteName = req.nextUrl.searchParams.get("name") ?? "My App";

  if (!prompt.trim()) {
    return new Response("Missing prompt", { status: 400 });
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

      // Send SSE comment pings every 15s so Vercel/proxies don't kill idle connections
      // between AI calls. SSE comments (": ping\n\n") are invisible to EventSource listeners.
      // Edge runtime streaming has no Vercel timeout so these are just belt-and-suspenders.
      const keepAlive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream closed
        }
      }, 15_000);

      try {
        // 0. Emit a generation token — the client saves this and sends it on reconnect.
        //    (No KV store yet: the server ignores ?token= and just restarts cleanly.
        //     The client-side useGenerationStream hook handles the retry UX.)
        send("token", { token: crypto.randomUUID() });

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

        // 4. Done — DB save is handled client-side via POST /api/generate/save
        //    so it runs on Node.js runtime (Prisma) without blocking the Edge stream.
        send("done", {
          files: result.files,
          qualityScore: result.qualityScore,
          pages: result.pages,
          warnings: result.warnings,
          // projectId will be populated by the client after saving
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Generation failed";
        send("error_event", { message });
      } finally {
        clearInterval(keepAlive);
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
