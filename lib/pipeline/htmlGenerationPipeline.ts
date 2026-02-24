// lib/pipeline/htmlGenerationPipeline.ts
// The complete fixed generation pipeline for HTML multi-page sites.
//
// Key fix: generates pages SEQUENTIALLY (one API call per page) rather than
// all at once. This prevents token exhaustion causing blank pages,
// and each page call includes the already-generated CSS/nav so design is consistent.

import Anthropic from "@anthropic-ai/sdk";
import {
  detectOutputMode,
  extractPages,
  type DetectedPage,
} from "@/lib/generation/detectOutputMode";
import {
  HTML_SYSTEM_PROMPT,
} from "@/lib/generation/htmlPrompt";
import {
  validatePageCompleteness,
  buildPageRegenerationPrompt,
} from "@/lib/validation/pageCompleteness";

const anthropic = new Anthropic();

export interface PipelineResult {
  success: boolean;
  files: Record<string, string>;
  mode: "html" | "react-spa" | "nextjs";
  pages: string[];
  warnings: string[];
  errors: string[];
  qualityScore: number;
}

export type ProgressCallback = (step: string, detail?: string) => void;
export type FileCallback = (path: string, content: string) => void;

/**
 * Main entry point -- detects mode, generates, validates, fixes blank pages
 */
export async function runGenerationPipeline(
  userPrompt: string,
  siteName: string,
  onProgress?: ProgressCallback,
  onFile?: FileCallback
): Promise<PipelineResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Step 1: Detect what kind of site to generate
  onProgress?.("detecting", "Analysing your prompt...");
  const detection = detectOutputMode(userPrompt);
  const pages = detection.pages.length > 0 ? detection.pages : extractPages(userPrompt, detection.mode);

  onProgress?.(
    "detected",
    `Detected: ${detection.mode} site with ${pages.length} pages (${detection.confidence} confidence)`
  );

  if (detection.mode !== "html") {
    warnings.push(`Detected ${detection.mode} -- routing to appropriate pipeline`);
  }

  // Step 2: Generate shared assets first (CSS + JS)
  onProgress?.("generating-styles", "Generating design system...");
  const sharedFiles = await generateSharedAssets(siteName, userPrompt, pages, onProgress);

  // Fire onFile for shared assets immediately
  if (sharedFiles["style.css"]) onFile?.("style.css", sharedFiles["style.css"]);
  if (sharedFiles["script.js"]) onFile?.("script.js", sharedFiles["script.js"]);

  // Step 3: Generate each page individually
  const generatedPages: Record<string, string> = {};

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const filename = page.slug === "index" ? "index.html" : `${page.slug}.html`;

    onProgress?.(
      `generating-page-${i + 1}`,
      `Generating ${page.name} page (${i + 1}/${pages.length})...`
    );

    const pageContent = await generateSinglePage(
      page, siteName, userPrompt, pages, sharedFiles, onProgress
    );

    generatedPages[filename] = pageContent;
    onFile?.(filename, pageContent); // fire as each page completes

    // Quick check -- if page is clearly broken, log it
    const bodyTextLength = extractBodyText(pageContent).length;
    if (bodyTextLength < 100) {
      warnings.push(`${filename}: Low content detected (${bodyTextLength} chars) -- may need review`);
    }
  }

  // Step 4: Combine all files
  const allFiles: Record<string, string> = {
    ...sharedFiles,
    ...generatedPages,
  };

  // Step 5: Validate completeness
  onProgress?.("validating", "Checking all pages for content...");
  const expectedPageFiles = pages.map((p) =>
    p.slug === "index" ? "index.html" : `${p.slug}.html`
  );
  const validation = validatePageCompleteness(allFiles, expectedPageFiles);

  // Step 6: Regenerate any broken/blank pages
  const pagesNeedingRegen = validation.pages.filter((p) => p.needsRegeneration);

  if (pagesNeedingRegen.length > 0) {
    onProgress?.("fixing", `Fixing ${pagesNeedingRegen.length} incomplete page(s)...`);

    for (const brokenPage of pagesNeedingRegen) {
      onProgress?.("regenerating", `Regenerating ${brokenPage.filename}...`);
      warnings.push(
        `${brokenPage.filename}: Auto-regenerated -- ${brokenPage.issues[0]?.message}`
      );

      const regenPrompt = buildPageRegenerationPrompt(
        brokenPage.filename, siteName, userPrompt, allFiles
      );

      const fixed = await regeneratePage(brokenPage.filename, regenPrompt);
      if (fixed) {
        allFiles[brokenPage.filename] = fixed;
        onFile?.(brokenPage.filename, fixed);
      }
    }
  }

  // Step 7: Report missing pages
  for (const missing of validation.missingPages) {
    errors.push(`Page "${missing}" was not generated -- add it manually or regenerate`);
  }

  // Step 8: Compute quality score
  const finalValidation = validatePageCompleteness(allFiles, expectedPageFiles);
  const qualityScore = computeQualityScore(finalValidation, allFiles);

  onProgress?.("complete", `Done -- ${Object.keys(allFiles).length} files, quality ${qualityScore}/100`);

  return {
    success: finalValidation.criticalErrors.length === 0,
    files: allFiles,
    mode: detection.mode,
    pages: expectedPageFiles,
    warnings,
    errors,
    qualityScore,
  };
}

// --- Shared asset generation ---

async function generateSharedAssets(
  siteName: string,
  userPrompt: string,
  pages: DetectedPage[],
  _onProgress?: ProgressCallback
): Promise<Record<string, string>> {
  const navLinks = pages.map((p) => {
    const filename = p.slug === "index" ? "index.html" : `${p.slug}.html`;
    return `<li><a href="${filename}">${p.name}</a></li>`;
  }).join("\n          ");

  const prompt = `Generate the shared design system and navigation for a website called "${siteName}".

User's design requirements:
${userPrompt}

Pages: ${pages.map((p) => p.name).join(", ")}

IMPORTANT: All pages will include Tailwind CDN. Use Tailwind classes for layout/styling.
Keep style.css minimal — only CSS custom properties, scroll-reveal animations, and anything Tailwind can't do.

Generate FOUR items:

1. style.css -- Minimal CSS:
   - :root custom properties for brand colors (derive from the prompt, e.g. coffee shop → warm browns)
   - .reveal class: opacity:0; transform:translateY(20px); transition:all 0.5s ease
   - .reveal.visible: opacity:1; transform:translateY(0)
   - Any bespoke animations (e.g. hero gradient shift, loading shimmer)
   - NO layout classes — Tailwind handles all layout

2. script.js -- Complete vanilla JavaScript:
   - Mobile hamburger nav toggle (toggles 'hidden' class on mobile menu)
   - Active nav link highlighting (match href to current filename)
   - Scroll reveal: IntersectionObserver adding 'visible' to .reveal elements
   - Form handler: handleFormSubmit(e) — e.preventDefault(), hides form, shows #form-success
   - Smooth scroll for anchor links

3. nav_html: A responsive Tailwind nav with:
   - Logo/site name on left (font-bold text-xl)
   - Desktop links: hidden sm:flex gap-8
   - Mobile hamburger button (sm:hidden) that toggles a mobile menu
   - Current page link gets visual active state
   - Include ALL these links: ${navLinks}
   - Style: bg-white shadow-sm sticky top-0 z-50

4. footer_html: A rich Tailwind footer with:
   - 3-column grid: brand blurb | quick links | contact info
   - Social media icon links (SVG icons for Twitter/X, LinkedIn, Instagram)
   - Copyright line
   - Style: bg-gray-900 text-gray-300 py-12

Return JSON exactly:
{
  "style.css": "/* minimal CSS */",
  "script.js": "// full JS",
  "nav_html": "<nav class=\\"...\\">...</nav>",
  "footer_html": "<footer class=\\"...\\">...</footer>"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 6000,
      system: HTML_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = safeParseJson(text);

    return {
      "style.css": parsed["style.css"] ?? defaultCss(siteName),
      "script.js": parsed["script.js"] ?? defaultJs(),
      "_nav_html": parsed["nav_html"] ?? "",
      "_footer_html": parsed["footer_html"] ?? "",
    };
  } catch {
    return {
      "style.css": defaultCss(siteName),
      "script.js": defaultJs(),
      "_nav_html": "",
      "_footer_html": "",
    };
  }
}

// --- Per-page generation ---

async function generateSinglePage(
  page: DetectedPage,
  siteName: string,
  userPrompt: string,
  allPages: DetectedPage[],
  sharedFiles: Record<string, string>,
  _onProgress?: ProgressCallback
): Promise<string> {
  const filename = page.slug === "index" ? "index.html" : `${page.slug}.html`;
  const navHtml = sharedFiles["_nav_html"] ?? "";
  const footerHtml = sharedFiles["_footer_html"] ?? "";
  const otherPageLinks = allPages
    .filter((p) => p.slug !== page.slug)
    .map((p) => `${p.slug === "index" ? "index.html" : `${p.slug}.html`} (${p.name})`)
    .join(", ");

  const prompt = `Generate the complete "${page.name}" page (${filename}) for "${siteName}".

USER'S ORIGINAL REQUEST:
${userPrompt}

PAGE FOCUS:
${page.description || `Create the full ${page.name} page with rich, professional content`}

━━━ TECHNICAL REQUIREMENTS ━━━
1. Output ONLY a complete <!DOCTYPE html> document — nothing else
2. Include in <head>:
   <script src="https://cdn.tailwindcss.com"></script>
   <script>tailwind.config = { theme: { extend: {} } }</script>
   <link rel="stylesheet" href="style.css">
3. Link before </body>: <script src="script.js"></script>
4. NO JSX, NO React, NO <ComponentName /> tags — pure HTML only
5. Other pages: ${otherPageLinks}

━━━ NAVIGATION (paste verbatim, mark ${page.name} link as active) ━━━
${navHtml || `<nav class="bg-white shadow-sm sticky top-0 z-50 px-6 py-4 flex justify-between items-center"><span class="font-bold text-xl">${siteName}</span><div class="flex gap-6">${allPages.map(p => `<a href="${p.slug === "index" ? "index.html" : `${p.slug}.html`}" class="text-gray-600 hover:text-indigo-600">${p.name}</a>`).join("")}</div></nav>`}

━━━ FOOTER (paste verbatim) ━━━
${footerHtml || `<footer class="bg-gray-900 text-gray-300 py-10 text-center"><p>&copy; 2024 ${siteName}</p></footer>`}

━━━ CONTENT REQUIREMENTS ━━━
This page MUST contain ALL of the following:

1. HERO SECTION — full-width, visually striking:
   - bg-gradient-to-br from-indigo-600 to-purple-700 text-white (or theme-appropriate gradient)
   - Large <h1> (text-4xl md:text-6xl font-extrabold)
   - Compelling subheading (<p class="text-xl opacity-90">)
   - 1-2 CTA buttons (bg-white text-indigo-600 or outlined)
   - Hero image: <img src="https://picsum.photos/seed/${page.slug}-hero/1200/500" alt="..." class="w-full h-64 object-cover rounded-2xl mt-8">

2. MAIN CONTENT SECTIONS (minimum 3 distinct sections):
   - Each with a heading, body text, and visual element (image, icon grid, or data table)
   - Section images: <img src="https://picsum.photos/seed/${page.slug}-s{N}/800/400" alt="..." class="rounded-xl shadow-lg">
   - Use Tailwind grid/flex layouts (grid grid-cols-1 md:grid-cols-3 gap-8)
   - Cards: class="bg-white rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all p-6"

3. SCROLL ANIMATIONS:
   - Add class="reveal" to every major section div
   - These animate in via script.js's IntersectionObserver

4. REAL CONTENT ONLY:
   - Invent specific, believable content for ${siteName}
   - NO lorem ipsum, NO "placeholder", NO "coming soon"
   - Real names, prices, descriptions relevant to the business

5. MINIMUM CONTENT: 600+ words of visible body text (excluding nav/footer)

${page.slug === "contact" ? `
CONTACT FORM REQUIREMENTS:
- <form id="contact-form" onsubmit="handleFormSubmit(event)" class="space-y-4 max-w-lg mx-auto">
  - Fields: Full Name, Email, Subject (select/dropdown), Message (textarea)
  - Submit: <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">Send Message</button>
- Hidden success state: <div id="form-success" class="hidden text-center py-12">
  <div class="text-5xl mb-4">✓</div>
  <h3 class="text-2xl font-bold text-green-600">Message Sent!</h3>
  <p class="text-gray-500 mt-2">We'll get back to you within 24 hours.</p>
</div>
` : ""}

Output ONLY the HTML file starting with <!DOCTYPE html>:`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 16000,
      system: HTML_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";

    // Extract HTML if wrapped in code block
    const htmlMatch =
      text.match(/```html\n?([\s\S]*?)```/) ?? text.match(/(<!DOCTYPE[\s\S]*)/i);
    const html = htmlMatch ? (htmlMatch[1] ?? htmlMatch[0]) : text;

    return html.trim();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return buildFallbackPage(page, siteName, navHtml, footerHtml, message);
  }
}

async function regeneratePage(_filename: string, regenPrompt: string): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 10000,
      system: HTML_SYSTEM_PROMPT,
      messages: [{ role: "user", content: regenPrompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const htmlMatch =
      text.match(/```html\n?([\s\S]*?)```/) ?? text.match(/(<!DOCTYPE[\s\S]*)/i);
    return htmlMatch ? (htmlMatch[1] ?? htmlMatch[0]).trim() : text.trim();
  } catch {
    return null;
  }
}

// --- Helpers ---

function safeParseJson(text: string): Record<string, string> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}

function extractBodyText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeQualityScore(
  validation: ReturnType<typeof validatePageCompleteness>,
  _files: Record<string, string>
): number {
  let score = 100;
  score -= validation.criticalErrors.length * 15;
  score -= validation.missingPages.length * 10;
  score -= validation.pages.filter((p) => p.isEmpty).length * 10;
  score -= validation.pages.filter((p) => p.hasJsxComponents).length * 20;
  return Math.max(0, Math.min(100, score));
}

function buildFallbackPage(
  page: DetectedPage,
  siteName: string,
  navHtml: string,
  footerHtml: string,
  error?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name} - ${siteName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-50">
  ${navHtml}
  <main>
    <section class="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <h1 class="text-4xl font-extrabold text-gray-900 mb-4">${page.name}</h1>
      <p class="text-gray-500 text-lg">This page could not be generated. Please click Regenerate.</p>
      ${error ? `<!-- Generation error: ${error} -->` : ""}
    </section>
  </main>
  ${footerHtml}
  <script src="script.js"></script>
</body>
</html>`;
}

function defaultCss(_siteName: string): string {
  return `/* Shared Stylesheet — Tailwind CDN handles layout; this adds scroll-reveal + brand tokens */
:root {
  --brand: #6366f1;
  --brand-dark: #4f46e5;
}

/* Scroll-reveal animation (triggered by script.js IntersectionObserver) */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Active nav link */
nav a.active {
  color: var(--brand);
  font-weight: 700;
}`;
}

function defaultJs(): string {
  return `document.addEventListener('DOMContentLoaded', function() {
  // Active nav link
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(function(a) {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Scroll-reveal
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

  // Mobile nav toggle
  var toggle = document.getElementById('nav-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function() { mobileMenu.classList.toggle('hidden'); });
  }
});

// Contact form handler — called via onsubmit="handleFormSubmit(event)"
function handleFormSubmit(e) {
  e.preventDefault();
  var form = e.target;
  var success = document.getElementById('form-success');
  if (form) form.style.display = 'none';
  if (success) success.style.display = 'block';
}`;
}
