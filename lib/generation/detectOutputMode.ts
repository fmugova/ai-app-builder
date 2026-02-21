// lib/generation/detectOutputMode.ts
// Reads the user's prompt and determines what kind of output to generate.
// This is the #1 source of the JSX-in-HTML bug -- mode is not being detected.

export type OutputMode = "html" | "react-spa" | "nextjs";

export interface ModeDetectionResult {
  mode: OutputMode;
  confidence: "high" | "medium" | "low";
  reason: string;
  pages: DetectedPage[];
  techStack: string[];
}

export interface DetectedPage {
  name: string;
  slug: string; // e.g. "about" -> "about.html" or "app/about/page.tsx"
  description: string;
}

// --- Keywords that signal each mode ---

const HTML_SIGNALS = [
  "html", "vanilla js", "vanilla javascript", "plain html", "static",
  "separate html pages", "shared css", "no framework", "pure html",
  "html file", "html pages", "cdn", "just html", "simple html",
  "html/css/js", "html, css", "html css js",
];

const NEXTJS_SIGNALS = [
  "next.js", "nextjs", "next js", "app router", "server component",
  "server action", "prisma", "supabase", "full-stack", "fullstack",
  "full stack", "api route", "database", "auth", "authentication",
  "login", "signup", "dashboard", "saas",
];

const REACT_SPA_SIGNALS = [
  "react", "vite", "create react app", "single page", "spa",
  "react router", "react app",
];

/**
 * Primary export -- call this before generation to pick the right strategy
 */
export function detectOutputMode(prompt: string): ModeDetectionResult {
  const lower = prompt.toLowerCase();

  const htmlScore = HTML_SIGNALS.filter((s) => lower.includes(s)).length;
  const nextjsScore = NEXTJS_SIGNALS.filter((s) => lower.includes(s)).length;
  const reactScore = REACT_SPA_SIGNALS.filter((s) => lower.includes(s)).length;

  let mode: OutputMode;
  let confidence: ModeDetectionResult["confidence"];
  let reason: string;

  if (nextjsScore >= 2) {
    mode = "nextjs";
    confidence = nextjsScore >= 4 ? "high" : "medium";
    reason = `Full-stack signals detected: ${NEXTJS_SIGNALS.filter((s) => lower.includes(s)).join(", ")}`;
  } else if (htmlScore >= 1 && nextjsScore === 0 && reactScore === 0) {
    mode = "html";
    confidence = htmlScore >= 2 ? "high" : "medium";
    reason = `Plain HTML signals: ${HTML_SIGNALS.filter((s) => lower.includes(s)).join(", ")}`;
  } else if (reactScore >= 1) {
    mode = "react-spa";
    confidence = reactScore >= 2 ? "high" : "medium";
    reason = `React SPA signals: ${REACT_SPA_SIGNALS.filter((s) => lower.includes(s)).join(", ")}`;
  } else {
    // Default: if prompt mentions pages/database/auth -> Next.js, otherwise HTML
    const hasComplexity = lower.includes("page") && (
      lower.includes("form") || lower.includes("filter") || lower.includes("search")
    );
    mode = hasComplexity ? "nextjs" : "html";
    confidence = "low";
    reason = "No clear framework signal -- inferred from complexity";
  }

  const pages = extractPages(prompt);
  const techStack = extractTechStack(prompt, mode);

  return { mode, confidence, reason, pages, techStack };
}

/**
 * Extract all page names from the prompt
 * e.g. "Home page, About page, Contact page" -> [{name:"Home", slug:"index"}, ...]
 */
export function extractPages(prompt: string): DetectedPage[] {
  const pages: DetectedPage[] = [];
  const lower = prompt.toLowerCase();

  // Pattern 1: numbered list "1. Home page - ..."
  const numberedPattern = /\d+\.\s+([\w\s]+?)(?:\s*[-–—]\s*(.*?))?(?=\n|\d+\.|$)/g;
  let match;
  while ((match = numberedPattern.exec(prompt)) !== null) {
    const name = match[1].trim().replace(/\s*page\s*/i, "").trim();
    const description = match[2]?.trim() ?? "";
    if (name && name.length < 30) {
      pages.push({ name: titleCase(name), slug: toSlug(name), description });
    }
  }

  if (pages.length > 0) return dedupPages(pages);

  // Pattern 2: "Pages: Home, About, Contact" or "pages include Home, About"
  const pagesListPattern = /pages?\s*[:–—]\s*([^\n.]+)/i;
  const pagesMatch = pagesListPattern.exec(prompt);
  if (pagesMatch) {
    const items = pagesMatch[1].split(/[,;]/);
    for (const item of items) {
      const name = item.trim().replace(/\(.*?\)/g, "").replace(/\s*page\s*/i, "").trim();
      if (name && name.length < 40 && name.length > 1) {
        pages.push({ name: titleCase(name), slug: toSlug(name), description: item.trim() });
      }
    }
  }

  if (pages.length > 0) return dedupPages(pages);

  // Pattern 3: Common page mentions anywhere in the prompt
  const commonPages = [
    { keywords: ["home", "landing", "hero", "index"], name: "Home", slug: "index" },
    { keywords: ["about", "story", "our story", "bio", "team"], name: "About", slug: "about" },
    { keywords: ["contact", "booking form", "book", "reach us"], name: "Contact", slug: "contact" },
    { keywords: ["services", "service", "menu", "pricing"], name: "Services", slug: "services" },
    { keywords: ["portfolio", "projects", "work", "gallery"], name: "Projects", slug: "projects" },
    { keywords: ["products", "shop", "store", "catalogue"], name: "Products", slug: "products" },
    { keywords: ["blog", "articles", "posts"], name: "Blog", slug: "blog" },
    { keywords: ["dashboard", "admin"], name: "Dashboard", slug: "dashboard" },
    { keywords: ["login", "sign in", "signin"], name: "Login", slug: "login" },
    { keywords: ["signup", "sign up", "register"], name: "Signup", slug: "signup" },
    { keywords: ["onboarding", "wizard", "setup"], name: "Onboarding", slug: "onboarding" },
    { keywords: ["cart", "basket"], name: "Cart", slug: "cart" },
    { keywords: ["checkout"], name: "Checkout", slug: "checkout" },
    { keywords: ["profile", "account", "settings"], name: "Profile", slug: "profile" },
  ];

  for (const pg of commonPages) {
    if (pg.keywords.some((k) => lower.includes(k))) {
      pages.push({ name: pg.name, slug: pg.slug, description: "" });
    }
  }

  // Always ensure Home/index is first
  const homeIdx = pages.findIndex((p) => p.slug === "index");
  if (homeIdx > 0) {
    const [home] = pages.splice(homeIdx, 1);
    pages.unshift(home);
  }
  if (homeIdx === -1 && pages.length > 0) {
    pages.unshift({ name: "Home", slug: "index", description: "Landing page" });
  }

  return dedupPages(pages);
}

function extractTechStack(prompt: string, mode: OutputMode): string[] {
  const lower = prompt.toLowerCase();
  const stack: string[] = [];

  if (mode === "html") stack.push("HTML5", "CSS3", "Vanilla JS");
  if (mode === "nextjs") stack.push("Next.js 14", "TypeScript", "Tailwind CSS");
  if (mode === "react-spa") stack.push("React", "Vite", "TypeScript");

  if (lower.includes("tailwind")) stack.push("Tailwind CSS");
  if (lower.includes("animation") || lower.includes("gsap")) stack.push("CSS Animations");
  if (lower.includes("glassmorphism")) stack.push("Glassmorphism CSS");
  if (lower.includes("prisma")) stack.push("Prisma");
  if (lower.includes("supabase")) stack.push("Supabase");
  if (lower.includes("stripe")) stack.push("Stripe");
  if (lower.includes("clerk")) stack.push("Clerk Auth");

  return [...new Set(stack)];
}

// --- Helpers ---

function toSlug(name: string): string {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  if (["home", "landing", "main", "index"].includes(slug)) return "index";
  return slug;
}

function titleCase(str: string): string {
  return str.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function dedupPages(pages: DetectedPage[]): DetectedPage[] {
  const seen = new Set<string>();
  return pages.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}
