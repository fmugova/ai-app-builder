// app/api/generate/stream/route.ts
// SSE endpoint powering the GenerationExperience component.
// Streams: plan -> step_start -> file -> step_done -> quality -> done

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGenerationPlan } from "@/lib/api/planGeneration";
import { runGenerationPipeline } from "@/lib/pipeline/htmlGenerationPipeline";

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

        // 4. Done
        send("done", {
          files: result.files,
          qualityScore: result.qualityScore,
          pages: result.pages,
          warnings: result.warnings,
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
