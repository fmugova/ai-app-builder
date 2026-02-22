// lib/generation/detectOutputMode.ts
// KEY FIX: Explicit framework declarations in prompt now hard-override inference.
// "Next.js 14 App Router, TypeScript" → nextjs, period. No ambiguity.

export type OutputMode = "html" | "react-spa" | "nextjs";

export interface ModeDetectionResult {
  mode: OutputMode;
  confidence: "explicit" | "high" | "medium" | "low";
  reason: string;
  pages: DetectedPage[];
  techStack: DetectedStack;
}

export interface DetectedPage {
  name: string;
  slug: string;
  description: string;
  routePath: string; // Next.js: "app/about/page.tsx" | HTML: "about.html"
}

export interface DetectedStack {
  framework: OutputMode;
  database?: "prisma" | "supabase-js" | "none";
  auth?: "nextauth" | "clerk" | "supabase-auth" | "none";
  styling?: "tailwind" | "css" | "styled-components";
  language: "typescript" | "javascript";
  hasStripe: boolean;
}

// ── Explicit override patterns ───────────────────────────────────────────────
// If ANY of these appear verbatim in the prompt, mode is locked immediately.
// User said it → we respect it, no inference needed.

const EXPLICIT_NEXTJS: RegExp[] = [
  /next\.?js\s*1[34]/i,         // "Next.js 14", "nextjs 13"
  /next\.?js\s*app\s*router/i,  // "Next.js App Router"
  /app\s*router/i,              // "App Router" alone
  /next\.?js/i,                 // any "Next.js" or "nextjs"
  /server\s*component/i,        // "Server Components"
  /server\s*action/i,           // "Server Actions"
];

const EXPLICIT_REACT: RegExp[] = [
  /\breact\b/i,                 // "React" (broad match)
  /\bvite\b/i,                  // "Vite"
  /create\s*react\s*app/i,      // "Create React App"
  /\bspa\b/i,                   // "SPA"
  /react\s*router/i,            // "React Router"
];

const EXPLICIT_HTML: RegExp[] = [
  /\bvanilla\s*js\b/i,
  /\bplain\s*html\b/i,
  /separate\s*html\s*page/i,    // "separate HTML pages"
  /\bstatic\s*site\b/i,
  /html\s*[,+\/]\s*css\s*[,+\/]\s*js/i, // "HTML/CSS/JS" or "HTML, CSS, JS"
  /no\s*framework/i,
  /shared\s*css/i,              // "shared CSS" (static site pattern)
];

// ── Stack detection ──────────────────────────────────────────────────────────

function detectStack(prompt: string): DetectedStack {
  const lower = prompt.toLowerCase();

  let framework: OutputMode = "html";

  // Check explicit in priority order: Next.js > React > HTML
  if (EXPLICIT_NEXTJS.some((r) => r.test(prompt))) {
    framework = "nextjs";
  } else if (EXPLICIT_REACT.some((r) => r.test(prompt))) {
    framework = "react-spa";
  } else if (EXPLICIT_HTML.some((r) => r.test(prompt))) {
    framework = "html";
  }

  // Database
  const database: DetectedStack["database"] =
    lower.includes("prisma") ? "prisma" :
    lower.includes("supabase") ? "supabase-js" :
    "none";

  // Auth
  const auth: DetectedStack["auth"] =
    lower.includes("nextauth") || lower.includes("next-auth") ? "nextauth" :
    lower.includes("clerk") ? "clerk" :
    lower.includes("supabase auth") ? "supabase-auth" :
    "none";

  // Styling
  const styling: DetectedStack["styling"] =
    lower.includes("tailwind") ? "tailwind" :
    lower.includes("styled-components") || lower.includes("css-in-js") ? "styled-components" :
    "css";

  // Language
  const language: DetectedStack["language"] =
    lower.includes("typescript") || lower.includes(" ts ") || lower.includes(".tsx") ? "typescript" : "javascript";

  return {
    framework,
    database,
    auth,
    styling,
    language,
    hasStripe: lower.includes("stripe"),
  };
}

/**
 * PRIMARY EXPORT — always call this before choosing a generation strategy
 */
export function detectOutputMode(prompt: string): ModeDetectionResult {
  const stack = detectStack(prompt);
  const mode = stack.framework;

  // Determine confidence level
  let confidence: ModeDetectionResult["confidence"] = "low";
  let reason = "";

  const isExplicitNextjs = EXPLICIT_NEXTJS.some((r) => r.test(prompt));
  const isExplicitReact = EXPLICIT_REACT.some((r) => r.test(prompt));
  const isExplicitHtml = EXPLICIT_HTML.some((r) => r.test(prompt));

  if (isExplicitNextjs) {
    confidence = "explicit";
    reason = `User explicitly specified Next.js`;
  } else if (isExplicitReact && !isExplicitNextjs) {
    confidence = "explicit";
    reason = `User explicitly specified React`;
  } else if (isExplicitHtml) {
    confidence = "explicit";
    reason = `User explicitly specified HTML/vanilla JS`;
  } else {
    // Inference mode — use complexity signals
    const lower = prompt.toLowerCase();
    const hasDB = stack.database !== "none";
    const hasAuth = stack.auth !== "none";
    const hasAPI = lower.includes("api") || lower.includes("backend") || lower.includes("server");

    if (hasDB && hasAuth) {
      confidence = "high";
      reason = "Database + auth detected — Next.js is strongly recommended";
    } else if (hasDB || hasAPI) {
      confidence = "medium";
      reason = "Backend requirements detected — defaulting to Next.js";
    } else if (lower.includes("dashboard") || lower.includes("app") || lower.includes("tracker")) {
      confidence = "medium";
      reason = "Interactive app detected — defaulting to React SPA";
    } else {
      confidence = "low";
      reason = "No framework signals — defaulting to plain HTML";
    }
  }

  const pages = extractPages(prompt, mode);

  return { mode, confidence, reason, pages, techStack: stack };
}

// ── Page extraction ──────────────────────────────────────────────────────────

export function extractPages(prompt: string, mode: OutputMode = "html"): DetectedPage[] {
  const pages: DetectedPage[] = [];

  // Pattern 1: Numbered list — "1. Home page – ..."
  const numbered = /^\s*\d+\.\s+([\w\s]+?)(?:\s*[-–—]\s*(.*?))?$/gm;
  let match: RegExpExecArray | null;
  while ((match = numbered.exec(prompt)) !== null) {
    const raw = match[1].trim().replace(/\s*page\s*/i, "").trim();
    if (raw && raw.length < 40) {
      const name = toTitleCase(raw);
      const slug = toSlug(raw);
      pages.push({
        name,
        slug,
        description: match[2]?.trim() ?? "",
        routePath: buildRoutePath(slug, mode),
      });
    }
  }
  if (pages.length > 0) return dedup(ensureHome(pages, mode));

  // Pattern 2: "Pages: X, Y, Z" or "Pages:\n- X\n- Y"
  const pagesListMatch = /pages?\s*[:–—]\s*([^\n]+)/i.exec(prompt);
  if (pagesListMatch) {
    const items = pagesListMatch[1].split(/[,;]/);
    for (const item of items) {
      const raw = item.trim().replace(/\(.*?\)/g, "").replace(/\s*page\s*/i, "").trim();
      if (raw && raw.length < 50 && raw.length > 1) {
        const name = toTitleCase(raw);
        const slug = toSlug(raw);
        pages.push({ name, slug, description: item.trim(), routePath: buildRoutePath(slug, mode) });
      }
    }
  }
  if (pages.length > 0) return dedup(ensureHome(pages, mode));

  // Pattern 3: Keyword detection
  const lower = prompt.toLowerCase();
  const KNOWN: Array<{ keywords: string[]; name: string; slug: string }> = [
    { keywords: ["home", "landing", "hero", "banner"], name: "Home", slug: "index" },
    { keywords: ["service", "menu", "pricing", "price"], name: "Services", slug: "services" },
    { keywords: ["about", "story", "our story", "team"], name: "About", slug: "about" },
    { keywords: ["contact", "booking", "book", "reach"], name: "Contact", slug: "contact" },
    { keywords: ["basket", "cart", "checkout", "shop"], name: "Basket", slug: "basket" },
    { keywords: ["product", "store", "catalogue"], name: "Products", slug: "products" },
    { keywords: ["dashboard", "admin"], name: "Dashboard", slug: "dashboard" },
    { keywords: ["blog", "article", "post"], name: "Blog", slug: "blog" },
    { keywords: ["login", "sign in", "signin"], name: "Login", slug: "login" },
    { keywords: ["signup", "sign up", "register"], name: "Signup", slug: "signup" },
    { keywords: ["onboarding", "wizard", "setup"], name: "Onboarding", slug: "onboarding" },
    { keywords: ["profile", "account", "settings"], name: "Profile", slug: "profile" },
  ];

  for (const pg of KNOWN) {
    if (pg.keywords.some((k) => lower.includes(k))) {
      pages.push({ name: pg.name, slug: pg.slug, description: "", routePath: buildRoutePath(pg.slug, mode) });
    }
  }

  return dedup(ensureHome(pages, mode));
}

// ── Route path builders ──────────────────────────────────────────────────────

function buildRoutePath(slug: string, mode: OutputMode): string {
  if (mode === "html") {
    return slug === "index" ? "index.html" : `${slug}.html`;
  }
  // Next.js App Router
  if (slug === "index") return "app/page.tsx";
  return `app/${slug}/page.tsx`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
  return ["home", "landing", "main", "index"].includes(slug) ? "index" : slug;
}

function toTitleCase(str: string): string {
  return str.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function ensureHome(pages: DetectedPage[], mode: OutputMode): DetectedPage[] {
  if (!pages.find((p) => p.slug === "index")) {
    pages.unshift({ name: "Home", slug: "index", description: "Landing page", routePath: buildRoutePath("index", mode) });
  }
  const idx = pages.findIndex((p) => p.slug === "index");
  if (idx > 0) {
    const [home] = pages.splice(idx, 1);
    pages.unshift(home);
  }
  return pages;
}

function dedup(pages: DetectedPage[]): DetectedPage[] {
  const seen = new Set<string>();
  return pages.filter((p) => { if (seen.has(p.slug)) return false; seen.add(p.slug); return true; });
}

/**
 * Returns a human-readable summary of what was detected.
 * Useful for showing users a "BuildFlow understood:" confirmation.
 */
export function summariseDetection(result: ModeDetectionResult): string {
  const { mode, confidence, techStack, pages } = result;
  const lines: string[] = [];

  lines.push(`Framework: ${mode === "nextjs" ? "Next.js 14 App Router" : mode === "react-spa" ? "React SPA (Vite)" : "Plain HTML"} (${confidence})`);
  if (techStack.database && techStack.database !== "none") lines.push(`Database: ${techStack.database}`);
  if (techStack.auth && techStack.auth !== "none") lines.push(`Auth: ${techStack.auth}`);
  if (techStack.styling) lines.push(`Styling: ${techStack.styling}`);
  lines.push(`Pages: ${pages.map((p) => p.name).join(", ")}`);

  return lines.join(" · ");
}
