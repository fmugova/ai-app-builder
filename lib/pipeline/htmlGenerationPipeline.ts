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

// ── Retry helper ─────────────────────────────────────────────────────────────
// Retries an Anthropic API call up to 2 extra times on 529 (overload) or 503
// errors, with exponential backoff. Other errors are re-thrown immediately so
// the caller can decide whether to use a fallback page.

type AnthropicCreateParams = Parameters<typeof anthropic.messages.create>[0];

async function createWithRetry(
  params: AnthropicCreateParams,
  maxRetries = 2
): ReturnType<typeof anthropic.messages.create> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status ?? 0;
      const retryable = status === 529 || status === 503 || status === 429;
      if (!retryable || attempt === maxRetries) throw lastError;
      // Exponential backoff: 3s, 6s
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  throw lastError;
}

// ── Model routing ────────────────────────────────────────────────────────────
// Opus is 3-4× slower than Sonnet for the same output with minimal quality
// difference for structured HTML. Haiku is used for simple, form-only pages.
// Budget: sonnet ~12-15s/page, haiku ~4-6s/page, keeping 8-page sites under 2min.

const SIMPLE_PAGE_SLUGS = new Set([
  "login", "signup", "register", "contact", "about", "auth",
  "error", "404", "terms", "privacy", "faq", "team", "blog",
]);

function pageModel(slug: string): string {
  return SIMPLE_PAGE_SLUGS.has(slug.toLowerCase())
    ? "claude-haiku-4-5-20251001"
    : "claude-sonnet-4-6";
}

function pageMaxTokens(slug: string): number {
  // Keep Haiku pages at 4000; Sonnet pages reduced from 12000 → 8000 to
  // cut per-page latency by ~33% and stay within Vercel's 300s function limit
  // on projects with 5-7 pages. 8000 tokens is still ~500+ lines of HTML.
  return SIMPLE_PAGE_SLUGS.has(slug.toLowerCase()) ? 4000 : 8000;
}

// Maximum pages per generation — prevents prompts like "build an entire SaaS"
// from generating 15+ pages and hitting the 300s Vercel Edge timeout.
const MAX_PAGES = 7;

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

  // Cap pages to prevent very long prompts from generating 10+ pages and
  // hitting the 300s Vercel Edge Function timeout.
  if (pages.length > MAX_PAGES) {
    warnings.push(
      `Prompt requested ${pages.length} pages — generating the first ${MAX_PAGES} to stay within time limits. Retry with a focused prompt to generate the remaining pages.`
    );
    pages.splice(MAX_PAGES);
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

  const hasAuthPages = pages.some((p) => ["login", "signup", "dashboard", "member", "account", "profile", "settings"].includes(p.slug));

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

2. script.js -- Complete vanilla JavaScript including ALL of these sections:
   a) DOMContentLoaded init:
      - Mobile hamburger nav toggle (toggles 'hidden' class on mobile menu)
      - Active nav link highlighting (match href to current filename)
      - Scroll reveal: IntersectionObserver adding 'visible' to .reveal elements
      - Smooth scroll for anchor links
      ${hasAuthPages ? `- Call updateNavForAuth() on load to show correct nav state` : ""}
   b) Contact form handler: handleFormSubmit(e) — e.preventDefault(), hides form, shows #form-success
   ${hasAuthPages ? `c) AUTH HELPERS (required — these power login/signup/logout):
      function getAuthUser() { try { return JSON.parse(localStorage.getItem('auth_user')||'null'); } catch { return null; } }
      function getAuthToken() { return localStorage.getItem('auth_token'); }
      function requireAuth(redirect) { if (!getAuthToken()) { window.location.href = redirect || 'login.html'; return false; } return true; }
      function logout() { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); window.location.href = 'index.html'; }
      function updateNavForAuth() {
        var user = getAuthUser();
        document.querySelectorAll('[data-auth="guest"]').forEach(function(el){ el.style.display = user ? 'none' : ''; });
        document.querySelectorAll('[data-auth="user"]').forEach(function(el){ el.style.display = user ? '' : 'none'; });
        var nameEl = document.getElementById('nav-user-name');
        if (nameEl && user) nameEl.textContent = user.name || user.email;
      }` : ""}

3. nav_html: A responsive Tailwind nav with:
   - Logo/site name on left (font-bold text-xl)
   - Desktop links: hidden sm:flex gap-8 items-center
   - Mobile hamburger button (sm:hidden) that toggles a mobile menu
   - Current page link gets visual active state
   - Include ALL these page links: ${navLinks}
   ${hasAuthPages ? `- Add AFTER the page links (desktop) — the auth state section:
     <!-- Guest links (hidden when logged in) -->
     <a href="login.html" data-auth="guest" class="text-gray-600 hover:text-indigo-600 text-sm font-medium">Login</a>
     <a href="signup.html" data-auth="guest" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Sign Up</a>
     <!-- User menu (hidden when logged out, display:none by default) -->
     <div data-auth="user" style="display:none" class="flex items-center gap-3">
       <span class="text-sm text-gray-700">Hi, <span id="nav-user-name"></span></span>
       <button onclick="logout()" class="text-sm text-gray-500 hover:text-red-600 font-medium">Logout</button>
     </div>` : ""}
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
    const response = await createWithRetry({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
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

  // Pages that must redirect to login if user is not authenticated
  const PROTECTED_SLUGS = new Set(["dashboard", "member", "account", "profile", "settings", "admin"]);
  const isProtected = PROTECTED_SLUGS.has(page.slug.toLowerCase());

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
${isProtected ? `6. AUTH GUARD REQUIRED — This is a protected page. Add this EXACT inline script as the FIRST script in <head> (before Tailwind):
   <script>if(!localStorage.getItem('auth_token')){window.location.replace('login.html');}</script>
   Also: show the logged-in user's name in the page heading using:
   <script>document.addEventListener('DOMContentLoaded',function(){try{var u=JSON.parse(localStorage.getItem('auth_user')||'null');if(u&&document.getElementById('user-name'))document.getElementById('user-name').textContent=u.name||u.email;}catch(e){}});</script>` : ""}

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
CONTACT FORM REQUIREMENTS (this form submits to a REAL backend):
- Use this EXACT form tag — do not change the action URL or onsubmit:
  <form id="contact-form" action="/api/projects/BUILDFLOW_PROJECT_ID/submissions" onsubmit="handleFormSubmit(event)" class="space-y-6 max-w-lg mx-auto">
    <input type="hidden" name="formType" value="contact">
    <!-- Full Name -->
    <div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
    <input type="text" name="name" required class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"></div>
    <!-- Email -->
    <div><label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
    <input type="email" name="email" required class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"></div>
    <!-- Subject -->
    <div><label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
    <select name="subject" class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none">
      <option>General Enquiry</option><option>Support</option><option>Partnership</option><option>Other</option>
    </select></div>
    <!-- Message -->
    <div><label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
    <textarea name="message" required rows="5" class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea></div>
    <button type="submit" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition">Send Message</button>
  </form>
- Immediately after the </form>, add the hidden success state:
  <div id="form-success" style="display:none" class="text-center py-16">
    <div class="text-6xl mb-4">✅</div>
    <h3 class="text-2xl font-bold text-green-600 mb-2">Message Sent!</h3>
    <p class="text-gray-500">We'll get back to you within 24 hours.</p>
  </div>
` : ""}

${page.slug === "login" ? `
LOGIN FORM REQUIREMENTS (this form authenticates against a REAL backend):
This is a REAL login page — users can actually create accounts and log in.
The auth endpoint is /api/public/auth/BUILDFLOW_PROJECT_ID

REQUIRED HTML STRUCTURE:
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <!-- Brand/Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-gray-900">${siteName}</h1>
        <p class="text-gray-500 mt-2">Sign in to your account</p>
      </div>
      <!-- Error message (hidden by default) -->
      <div id="auth-error" style="display:none" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm"></div>
      <!-- Login form -->
      <form id="login-form" class="space-y-5" onsubmit="onLoginSubmit(event)">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" id="login-email" required placeholder="you@example.com"
            class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" id="login-password" required placeholder="••••••••"
            class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
        </div>
        <button type="submit" id="submit-btn"
          class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-sm">
          Sign In
        </button>
      </form>
      <p class="text-center text-sm text-gray-500 mt-6">
        Don't have an account?
        <a href="signup.html" class="text-indigo-600 hover:underline font-medium">Create one</a>
      </p>
    </div>
  </div>

REQUIRED INLINE SCRIPT (place just before </body>):
  <script>
    async function handleAuth(action, email, password, name) {
      var btn = document.getElementById('submit-btn');
      var errEl = document.getElementById('auth-error');
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Please wait...';
      try {
        var res = await fetch('/api/public/auth/BUILDFLOW_PROJECT_ID', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: action, email: email, password: password, name: name })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.location.href = 'index.html';
      } catch(e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = action === 'register' ? 'Create Account' : 'Sign In';
      }
    }
    function onLoginSubmit(e) {
      e.preventDefault();
      handleAuth('login', document.getElementById('login-email').value, document.getElementById('login-password').value, null);
    }
  </script>

DO NOT include nav or hero section on this page — it's a full-page auth screen.
` : ""}

${page.slug === "signup" ? `
SIGNUP FORM REQUIREMENTS (this form creates a REAL account in the backend):
This is a REAL signup page — users can actually register and log in.
The auth endpoint is /api/public/auth/BUILDFLOW_PROJECT_ID

REQUIRED HTML STRUCTURE:
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <!-- Brand/Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-gray-900">${siteName}</h1>
        <p class="text-gray-500 mt-2">Create your account</p>
      </div>
      <!-- Error message (hidden by default) -->
      <div id="auth-error" style="display:none" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm"></div>
      <!-- Signup form -->
      <form id="signup-form" class="space-y-5" onsubmit="onSignupSubmit(event)">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" id="signup-name" required placeholder="Jane Smith"
            class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" id="signup-email" required placeholder="you@example.com"
            class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" id="signup-password" required placeholder="Min. 8 characters"
            class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
        </div>
        <div class="flex items-start gap-3">
          <input type="checkbox" id="terms" required class="mt-1 accent-indigo-600">
          <label for="terms" class="text-sm text-gray-600">I agree to the <a href="#" class="text-indigo-600 hover:underline">Terms of Service</a> and <a href="#" class="text-indigo-600 hover:underline">Privacy Policy</a></label>
        </div>
        <button type="submit" id="submit-btn"
          class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-sm">
          Create Account
        </button>
      </form>
      <p class="text-center text-sm text-gray-500 mt-6">
        Already have an account?
        <a href="login.html" class="text-indigo-600 hover:underline font-medium">Sign in</a>
      </p>
    </div>
  </div>

REQUIRED INLINE SCRIPT (place just before </body>):
  <script>
    async function handleAuth(action, email, password, name) {
      var btn = document.getElementById('submit-btn');
      var errEl = document.getElementById('auth-error');
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Please wait...';
      try {
        var res = await fetch('/api/public/auth/BUILDFLOW_PROJECT_ID', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: action, email: email, password: password, name: name })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.location.href = 'index.html';
      } catch(e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = action === 'register' ? 'Create Account' : 'Sign In';
      }
    }
    function onSignupSubmit(e) {
      e.preventDefault();
      handleAuth('register', document.getElementById('signup-email').value, document.getElementById('signup-password').value, document.getElementById('signup-name').value);
    }
  </script>

DO NOT include nav or hero section on this page — it's a full-page auth screen.
` : ""}

Output ONLY the HTML file starting with <!DOCTYPE html>:`;

  try {
    const response = await createWithRetry({
      model: pageModel(page.slug),
      max_tokens: pageMaxTokens(page.slug),
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
  const slug = filename.replace(/\.html$/, "");
  try {
    const response = await createWithRetry({
      model: pageModel(slug),
      max_tokens: pageMaxTokens(slug),
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
  return `// ── Auth helpers ──────────────────────────────────────────────────────────
function getAuthUser() { try { return JSON.parse(localStorage.getItem('auth_user')||'null'); } catch { return null; } }
function getAuthToken() { return localStorage.getItem('auth_token'); }
function requireAuth(redirect) { if (!getAuthToken()) { window.location.href = redirect || 'login.html'; return false; } return true; }
function logout() { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); window.location.href = 'index.html'; }
function updateNavForAuth() {
  var user = getAuthUser();
  document.querySelectorAll('[data-auth="guest"]').forEach(function(el){ el.style.display = user ? 'none' : ''; });
  document.querySelectorAll('[data-auth="user"]').forEach(function(el){ el.style.display = user ? '' : 'none'; });
  var nameEl = document.getElementById('nav-user-name');
  if (nameEl && user) nameEl.textContent = user.name || user.email;
}

document.addEventListener('DOMContentLoaded', function() {
  // Auth nav state
  updateNavForAuth();

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

// Contact form handler — POSTs to BuildFlow backend, then shows success state
function handleFormSubmit(e) {
  e.preventDefault();
  var form = e.target;
  var data = { formType: 'contact' };
  new FormData(form).forEach(function(v, k) { data[k] = v; });
  fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).finally(function() {
    form.style.display = 'none';
    var s = document.getElementById('form-success');
    if (s) s.style.display = 'block';
  });
}`;
}
