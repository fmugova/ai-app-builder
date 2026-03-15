// app/api/generate/stream/route.ts
// SSE endpoint powering the GenerationExperience component.
// Streams: token -> plan -> step_start -> file -> step_done -> quality -> done
//
// Node.js runtime with maxDuration:300 — allows generation to run up to 5 minutes.
// Auth uses getToken (JWT-only, works in both Edge and Node runtimes).
// DB save is handled client-side via POST /api/generate/save after the done event.

import { NextRequest } from "next/server";
import { withLogging } from "@/lib/with-logging";
import { getToken } from "next-auth/jwt";
import { createGenerationPlan } from "@/lib/api/planGeneration";
import { runGenerationPipeline } from "@/lib/pipeline/htmlGenerationPipeline";
import { runNextjsGenerationPipeline } from "@/lib/pipeline/nextjsGenerationPipeline";
import { runReactSpaPipeline } from "@/lib/pipeline/reactSpaPipeline";
import { detectOutputMode } from "@/lib/generation/detectOutputMode";
import { selectScaffold, scaffoldUsesNextjs } from "@/lib/scaffolds/scaffold-selector";
import { rateLimiters } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";

// Detect whether the prompt warrants a Next.js full-stack project.
// HTML is still the default for marketing sites and simple apps (localStorage CRUD).
// Next.js is reserved for prompts that explicitly request it or that clearly need
// a backend (auth, database, multi-user, real-time, payments, etc.).
function shouldUseNextjs(prompt: string): boolean {
  const detection = detectOutputMode(prompt);
  if (detection.mode === "nextjs") return true; // user said "Next.js", "App Router", etc.
  // react-spa no longer routes to Next.js — it has its own pipeline now

  // Infer from backend-only keywords — marketing sites and simple apps stay as HTML
  const lower = prompt.toLowerCase();
  const BACKEND_SIGNALS = [
    "sign in", "sign up", "login", "register", "authentication", "oauth",
    "database", "db", "sql", "postgresql", "mysql", "mongo",
    "user account", "user profile", "user data", "multi-user", "team",
    "stripe", "payment", "subscription", "billing", "checkout",
    "real-time", "realtime", "websocket",
    "server side", "server-side", "ssr",
    "api route", "backend", "full-stack", "fullstack",
    "supabase", "firebase", "prisma", "drizzle",
  ];
  return BACKEND_SIGNALS.some((k) => lower.includes(k));
}

// Detect whether the prompt warrants a React SPA (Vite + React Router).
// Triggers on explicit React/SPA keywords that don't also imply a backend.
function shouldUseReactSpa(prompt: string): boolean {
  const detection = detectOutputMode(prompt);
  return detection.mode === "react-spa";
}

// Node.js runtime — vercel.json functions.maxDuration:300 applies here.
// Edge Runtime ignores the vercel.json functions config and caps at 30s.
export const maxDuration = 300;

async function GETHandler(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Enforce per-user AI rate limit based on subscription tier
  const dbUser = await prisma.user.findUnique({
    where: { email: token.email as string },
    select: { id: true, subscriptionTier: true },
  });
  if (!dbUser) {
    return new Response("Unauthorized", { status: 401 });
  }
  const tier = (dbUser.subscriptionTier ?? "free").toLowerCase();
  const limiterKey =
    tier === "enterprise" ? "aiEnterprise" : tier === "pro" ? "aiPro" : "aiFree";
  const rl = await rateLimiters[limiterKey].limit(dbUser.id);
  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: "AI generation rate limit exceeded. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.reset),
        },
      }
    );
  }

  const prompt = req.nextUrl.searchParams.get("prompt") ?? "";
  const siteName = req.nextUrl.searchParams.get("name") ?? "My App";
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "";
  // Phase wizard params — phasePrompt overrides the generation prompt while keeping
  // the original prompt for plan creation and display.
  const phasePrompt = req.nextUrl.searchParams.get("phasePrompt") ?? "";
  const scaffoldTypeParam = req.nextUrl.searchParams.get("scaffoldType") ?? "";

  if (!prompt.trim()) {
    return new Response("Missing prompt", { status: 400 });
  }

  // Fetch Supabase connection if projectId provided — used to inject real DB into HTML pipeline
  let dbConnection: { supabaseUrl: string; supabaseAnonKey: string } | null = null;
  if (projectId) {
    const conn = await prisma.databaseConnection.findFirst({
      where: { projectId, status: "connected" },
      select: { supabaseUrl: true, supabaseAnonKey: true },
    });
    if (conn?.supabaseUrl && conn?.supabaseAnonKey) {
      dbConnection = { supabaseUrl: conn.supabaseUrl, supabaseAnonKey: conn.supabaseAnonKey };
    }
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

        // Scaffold-aware routing: use selectScaffold() for 7-way type detection,
        // fall back to the original keyword-based shouldUseNextjs() for explicit keywords.
        const scaffoldResult = selectScaffold(prompt);
        const useReactSpa = shouldUseReactSpa(prompt);
        const useNextjs = !useReactSpa &&
          (scaffoldUsesNextjs(scaffoldResult.scaffold) || shouldUseNextjs(prompt));

        // Resolved scaffold type: prefer explicit param (from wizard) over auto-detected
        const scaffoldType = scaffoldTypeParam || scaffoldResult.scaffold;

        // Use phasePrompt for generation if provided (phase wizard flow).
        // The original prompt is still used for plan creation so it stays descriptive.
        const generationPrompt = phasePrompt || prompt;

        // 1. Generate plan (fast -- uses haiku, ~1s)
        const plan = await createGenerationPlan(prompt, siteName);
        // Override mode in plan so client knows what was generated
        if (useNextjs) plan.mode = "nextjs";
        else if (useReactSpa) plan.mode = "react-spa";
        send("plan", plan);

        // 2. Execute the appropriate generation pipeline
        let stepIndex = 0;

        let result;

        if (useNextjs) {
          // ── Next.js + Supabase pipeline ─────────────────────────────────────
          // Announce the generation step immediately
          const firstStep = plan.steps[0];
          if (firstStep) {
            send("step_start", { stepId: firstStep.id, label: "Generating Next.js app…" });
          }

          result = await runNextjsGenerationPipeline(
            generationPrompt,
            siteName,
            // onProgress: log to server, no client events needed (one big call)
            (step, detail) => {
              if (detail) console.log(`[generate/stream/nextjs] ${step}: ${detail}`);
            },
            // onFile: stream each file to client
            (path: string, content: string) => {
              send("file", { path, content });
            },
            scaffoldType
          );

          // Mark all plan steps done
          for (const step of plan.steps) {
            send("step_done", { stepId: step.id });
          }

        } else if (useReactSpa) {
          // ── React SPA pipeline ────────────────────────────────────────────────
          const firstStep = plan.steps[0];
          if (firstStep) {
            send("step_start", { stepId: firstStep.id, label: "Generating React SPA…" });
          }

          result = await runReactSpaPipeline(
            generationPrompt,
            siteName,
            (step, detail) => {
              if (detail) console.log(`[generate/stream/react-spa] ${step}: ${detail}`);
            },
            (path: string, content: string) => {
              send("file", { path, content });
            },
          );

          // Mark all plan steps done
          for (const step of plan.steps) {
            send("step_done", { stepId: step.id });
          }

        } else {
          // ── HTML multi-page pipeline ─────────────────────────────────────────
          result = await runGenerationPipeline(
            generationPrompt,
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
            },
            dbConnection
          );

          // Mark any remaining steps as done
          for (let i = stepIndex; i < plan.steps.length; i++) {
            send("step_done", { stepId: plan.steps[i].id });
          }
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
          mode: result.mode,   // ← "html" | "nextjs" — tells client which preview to show
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

export const GET = withLogging(GETHandler);
