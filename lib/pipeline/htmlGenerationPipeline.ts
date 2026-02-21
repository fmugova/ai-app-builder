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

/**
 * Main entry point -- detects mode, generates, validates, fixes blank pages
 */
export async function runGenerationPipeline(
  userPrompt: string,
  siteName: string,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Step 1: Detect what kind of site to generate
  onProgress?.("detecting", "Analysing your prompt...");
  const detection = detectOutputMode(userPrompt);
  const pages = detection.pages.length > 0 ? detection.pages : extractPages(userPrompt);

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
      if (fixed) allFiles[brokenPage.filename] = fixed;
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

  const prompt = `Generate a shared CSS file and JavaScript file for a website called "${siteName}".

User's design requirements from their prompt:
${userPrompt}

Pages that will use these files: ${pages.map((p) => p.name).join(", ")}

Generate TWO files:

1. style.css -- Complete CSS including:
   - CSS custom properties (color palette, typography scale)
   - CSS reset/base styles
   - Shared layout: header, nav, footer, main content
   - Component styles: buttons, cards, forms, badges
   - Responsive breakpoints (mobile-first)
   - Any animations/transitions requested
   - Page-specific section classes

2. script.js -- JavaScript including:
   - Mobile navigation toggle
   - Smooth scroll
   - Scroll-triggered animations (IntersectionObserver)
   - Form validation function (validateForm)
   - Active nav link highlighting based on current page

Also provide the SHARED NAV HTML to reuse in every page:
nav_html: <nav>...</nav>

And SHARED FOOTER HTML:
footer_html: <footer>...</footer>

The nav must include these links:
<ul>
  ${navLinks}
</ul>

Return JSON:
{
  "style.css": "/* full CSS */",
  "script.js": "// full JS",
  "nav_html": "<nav>...</nav>",
  "footer_html": "<footer>...</footer>"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8000,
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

  const prompt = `Generate the "${page.name}" page (${filename}) for "${siteName}".

USER'S ORIGINAL REQUEST:
${userPrompt}

THIS PAGE'S SPECIFIC CONTENT:
${page.description || `Create the full ${page.name} page with complete, real content`}

CRITICAL RULES:
1. Output ONLY a complete <!DOCTYPE html> HTML file
2. NO JSX, NO React components, NO <ComponentName /> tags
3. Every section must have REAL text content -- no empty divs, no placeholder text
4. Link stylesheet: <link rel="stylesheet" href="style.css">
5. Link script (before </body>): <script src="script.js"></script>
6. Other pages to link to: ${otherPageLinks}

NAVIGATION TO INCLUDE (copy this exactly, mark current page as active):
${navHtml || `<nav><a href="index.html">${siteName}</a> | ${allPages.map(p => `<a href="${p.slug === "index" ? "index.html" : `${p.slug}.html`}">${p.name}</a>`).join(" | ")}</nav>`}

FOOTER TO INCLUDE (copy this exactly):
${footerHtml || `<footer><p>&copy; 2024 ${siteName}. All rights reserved.</p></footer>`}

PAGE-SPECIFIC REQUIREMENTS:
This page (${page.name}) MUST include:
- A proper hero/header section for this page (not generic -- specific to ${page.name})
- At least 3 substantial content sections with real headings and body text
- All interactive elements mentioned in the original prompt for this page
- Real, believable content specific to ${siteName} -- no lorem ipsum
- Mobile-responsive layout

IMPORTANT: The body content should be substantial and complete.
Minimum: 500+ characters of visible text content beyond navigation/footer.

Output ONLY the HTML file. Start with <!DOCTYPE html>:`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 12000,
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

async function regeneratePage(filename: string, regenPrompt: string): Promise<string | null> {
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
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${navHtml}
  <main>
    <section style="padding:80px 20px;text-align:center">
      <h1>${page.name}</h1>
      <p>This page is being generated. Please regenerate if this message persists.</p>
      ${error ? `<!-- Generation error: ${error} -->` : ""}
    </section>
  </main>
  ${footerHtml}
  <script src="script.js"></script>
</body>
</html>`;
}

function defaultCss(siteName: string): string {
  return `/* ${siteName} - Shared Stylesheet */
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border: #e5e7eb;
  --radius: 8px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;color:var(--text);background:var(--bg);line-height:1.6}
nav{padding:16px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)}
nav ul{list-style:none;display:flex;gap:24px}
nav a{text-decoration:none;color:var(--text);font-weight:500}
nav a:hover,nav a.active{color:var(--primary)}
main{min-height:80vh}
.hero{padding:80px 24px;text-align:center;max-width:800px;margin:0 auto}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;margin-bottom:16px}
.hero p{font-size:1.2rem;color:var(--muted);margin-bottom:32px}
.btn{display:inline-block;padding:12px 24px;background:var(--primary);color:#fff;border-radius:var(--radius);text-decoration:none;font-weight:600;border:none;cursor:pointer}
.btn:hover{background:var(--primary-dark)}
.section{padding:64px 24px;max-width:1200px;margin:0 auto}
.grid{display:grid;gap:24px}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{padding:24px;border:1px solid var(--border);border-radius:var(--radius)}
footer{padding:40px 24px;text-align:center;border-top:1px solid var(--border);color:var(--muted)}`;
}

function defaultJs(): string {
  return `// Shared scripts
document.addEventListener('DOMContentLoaded',()=>{
  // Active nav link
  const links=document.querySelectorAll('nav a');
  const path=location.pathname.split('/').pop()||'index.html';
  links.forEach(a=>{if(a.getAttribute('href')===path)a.classList.add('active')});

  // Scroll animations
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
  },{threshold:0.1});
  document.querySelectorAll('.animate').forEach(el=>observer.observe(el));

  // Form validation
  window.validateForm=function(form){
    let valid=true;
    form.querySelectorAll('[required]').forEach(field=>{
      if(!field.value.trim()){field.style.borderColor='red';valid=false;}
      else field.style.borderColor='';
    });
    return valid;
  };
});`;
}
