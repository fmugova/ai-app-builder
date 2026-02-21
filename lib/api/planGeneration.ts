// lib/api/planGeneration.ts
// Generates a structured plan BEFORE writing any code.
// Called first so the UI can show the plan while execution streams in.

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export type StepStatus = "pending" | "running" | "done" | "error";
export type StepCategory =
  | "schema"
  | "config"
  | "types"
  | "component"
  | "hook"
  | "page"
  | "api"
  | "style"
  | "test"
  | "build";

export interface PlanStep {
  id: string;
  label: string;
  detail: string;
  category: StepCategory;
  files: string[]; // files this step will produce
  status: StepStatus;
  durationMs?: number;
}

export interface GenerationPlan {
  title: string;
  description: string;
  mode: "html" | "react" | "nextjs";
  estimatedFiles: number;
  estimatedSeconds: number;
  steps: PlanStep[];
  pages: { name: string; file: string }[];
}

const PLANNER_SYSTEM = `You are a senior software architect planning a web application build.
Given a user's request, produce a structured build plan.
Output ONLY valid JSON -- no markdown, no explanation.`;

/**
 * Generate a build plan from the user's prompt.
 * Fast -- uses a small model (~1 second).
 */
export async function createGenerationPlan(
  prompt: string,
  siteName: string
): Promise<GenerationPlan> {
  const lower = prompt.toLowerCase();

  // Detect mode
  const isNextjs =
    lower.includes("next") ||
    lower.includes("full-stack") ||
    lower.includes("fullstack") ||
    lower.includes("database") ||
    lower.includes("auth") ||
    lower.includes("prisma") ||
    lower.includes("supabase");

  const isReact =
    !isNextjs &&
    (lower.includes("react") ||
      lower.includes("spa") ||
      lower.includes("dashboard") ||
      lower.includes("app") ||
      lower.includes("task manager") ||
      lower.includes("todo"));

  const mode = isNextjs ? "nextjs" : isReact ? "react" : "html";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: PLANNER_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Create a build plan for this web project:
Name: "${siteName}"
Request: ${prompt}
Mode: ${mode}

Return JSON matching this exact shape:
{
  "title": "string",
  "description": "string -- one sentence summary",
  "mode": "${mode}",
  "estimatedFiles": number,
  "estimatedSeconds": number,
  "pages": [{"name":"Home","file":"index.html"}],
  "steps": [
    {
      "id": "step-1",
      "label": "Create database schema",
      "detail": "Define tasks table with id, title, status, priority, createdAt",
      "category": "schema",
      "files": ["prisma/schema.prisma"],
      "status": "pending"
    }
  ]
}

Rules for steps:
- 6-10 steps total
- Each step produces 1-4 files
- Steps must be in dependency order (shared CSS before pages, types before components)
- Labels are short (5 words max), details explain what's being built
- Categories: schema | config | types | component | hook | page | api | style | build
- For HTML mode: steps like "Set up design system", "Build home page", "Build about page" etc.
- For React mode: steps like "Configure Vite + TypeScript", "Define types", "Create hooks", "Build components", "Wire app together"
- For Next.js mode: full-stack steps including database, auth, API routes, components, pages`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]) as GenerationPlan;
      // Ensure all steps start as pending
      plan.steps = plan.steps.map((s, i) => ({
        ...s,
        id: s.id ?? `step-${i + 1}`,
        status: "pending" as StepStatus,
      }));
      return plan;
    }
  } catch {
    // Fall through to fallback
  }

  return buildFallbackPlan(prompt, siteName, mode);
}

function buildFallbackPlan(
  prompt: string,
  siteName: string,
  mode: "html" | "react" | "nextjs"
): GenerationPlan {
  const lower = prompt.toLowerCase();

  if (mode === "react") {
    return {
      title: siteName,
      description: `React application with TypeScript and Tailwind CSS`,
      mode: "react",
      estimatedFiles: 12,
      estimatedSeconds: 45,
      pages: [{ name: "App", file: "App.tsx" }],
      steps: [
        { id: "s1", label: "Configure project", detail: "Set up Vite, TypeScript, Tailwind config", category: "config", files: ["vite.config.ts", "tailwind.config.ts", "tsconfig.json"], status: "pending" },
        { id: "s2", label: "Define types", detail: "TypeScript interfaces for all data models", category: "types", files: ["src/lib/types.ts"], status: "pending" },
        { id: "s3", label: "Build custom hooks", detail: "State management and data hooks", category: "hook", files: ["src/hooks/useData.ts"], status: "pending" },
        { id: "s4", label: "Create UI components", detail: "Reusable card, button, form components", category: "component", files: ["src/components/ui/"], status: "pending" },
        { id: "s5", label: "Build main components", detail: "Feature-specific components", category: "component", files: ["src/components/"], status: "pending" },
        { id: "s6", label: "Assemble application", detail: "Wire together in App.tsx", category: "build", files: ["src/App.tsx", "src/main.tsx"], status: "pending" },
      ],
    };
  }

  if (mode === "html") {
    const pages = extractPagesFromPrompt(lower);
    const pageSteps = pages.map((p, i) => ({
      id: `s${i + 3}`,
      label: `Build ${p.name} page`,
      detail: `Complete HTML for ${p.name} with real content`,
      category: "page" as StepCategory,
      files: [p.file],
      status: "pending" as StepStatus,
    }));

    return {
      title: siteName,
      description: `Multi-page HTML website with shared CSS and vanilla JavaScript`,
      mode: "html",
      estimatedFiles: pages.length + 2,
      estimatedSeconds: pages.length * 15,
      pages,
      steps: [
        { id: "s1", label: "Set up design system", detail: "CSS variables, typography, shared components", category: "style", files: ["style.css"], status: "pending" },
        { id: "s2", label: "Build shared scripts", detail: "Navigation, animations, form validation", category: "config", files: ["script.js"], status: "pending" },
        ...pageSteps,
      ],
    };
  }

  // Next.js fallback
  return {
    title: siteName,
    description: `Full-stack Next.js application`,
    mode: "nextjs",
    estimatedFiles: 20,
    estimatedSeconds: 90,
    pages: [{ name: "Home", file: "app/page.tsx" }],
    steps: [
      { id: "s1", label: "Database schema", detail: "Prisma models and migrations", category: "schema", files: ["prisma/schema.prisma"], status: "pending" },
      { id: "s2", label: "Configure project", detail: "Next.js, TypeScript, environment setup", category: "config", files: ["next.config.js", "lib/prisma.ts"], status: "pending" },
      { id: "s3", label: "Define types", detail: "TypeScript types for all models", category: "types", files: ["lib/types.ts"], status: "pending" },
      { id: "s4", label: "Build API routes", detail: "REST endpoints for data operations", category: "api", files: ["app/api/"], status: "pending" },
      { id: "s5", label: "Create components", detail: "Reusable UI components", category: "component", files: ["components/"], status: "pending" },
      { id: "s6", label: "Build pages", detail: "All application pages", category: "page", files: ["app/"], status: "pending" },
    ],
  };
}

function extractPagesFromPrompt(lower: string): { name: string; file: string }[] {
  const pages: { name: string; file: string }[] = [];

  const commonPages = [
    { keywords: ["home", "landing", "hero"], name: "Home", file: "index.html" },
    { keywords: ["about", "story", "our story"], name: "About", file: "about.html" },
    { keywords: ["service", "menu", "pricing"], name: "Services", file: "services.html" },
    { keywords: ["contact", "booking", "book"], name: "Contact", file: "contact.html" },
    { keywords: ["project", "portfolio", "work"], name: "Projects", file: "projects.html" },
    { keywords: ["product", "shop", "store"], name: "Products", file: "products.html" },
    { keywords: ["blog", "article", "post"], name: "Blog", file: "blog.html" },
  ];

  for (const pg of commonPages) {
    if (pg.keywords.some((k) => lower.includes(k))) pages.push({ name: pg.name, file: pg.file });
  }

  if (!pages.find((p) => p.file === "index.html")) {
    pages.unshift({ name: "Home", file: "index.html" });
  }

  return pages;
}
