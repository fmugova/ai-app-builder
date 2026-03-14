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
import { getImagePaletteBlock } from "@/lib/imageLibrary";
import {
  validatePageCompleteness,
  buildPageRegenerationPrompt,
} from "@/lib/validation/pageCompleteness";
import { CodeAutoFixer } from "@/lib/validators/auto-fixer";
import { AUTH_JS_TEMPLATE } from "@/lib/scaffold/authTemplate";
import { FORMS_JS_TEMPLATE } from "@/lib/scaffold/formsTemplate";
import { TOAST_JS_TEMPLATE } from "@/lib/scaffold/toastTemplate";
import { CONSENT_JS_TEMPLATE } from "@/lib/scaffold/consentTemplate";
import { buildAnalyticsJs } from "@/lib/scaffold/analyticsTemplate";
import { build404Page } from "@/lib/scaffold/404Template";
import { detectScaffoldType, getDefaultPages } from "@/lib/pipeline/detectScaffoldType";
import {
  RESTAURANT_MENU_JS_TEMPLATE,
  generateRestaurantMigration,
  RESTAURANT_SYSTEM_PROMPT_ADDON,
  RESERVATION_PAGE_SCRIPT,
  DEFAULT_OPENING_HOURS,
} from "@/lib/scaffold/restaurantScaffold";
import {
  SAAS_WAITLIST_JS_TEMPLATE,
  SAAS_SYSTEM_PROMPT_ADDON,
  SAAS_PRICING_PAGE_SCRIPT,
} from "@/lib/scaffold/saasScaffold";
import {
  PORTFOLIO_GALLERY_JS_TEMPLATE,
  PORTFOLIO_SYSTEM_PROMPT_ADDON,
} from "@/lib/scaffold/portfolioScaffold";
import {
  APP_JS_TEMPLATE,
  APP_SYSTEM_PROMPT_ADDON,
} from "@/lib/scaffold/appScaffold";
import {
  PROFESSIONAL_JS_TEMPLATE,
  PROFESSIONAL_SYSTEM_PROMPT_ADDON,
} from "@/lib/scaffold/professionalScaffold";
import {
  BLOG_JS_TEMPLATE,
  BLOG_HTML_SYSTEM_PROMPT_ADDON,
} from "@/lib/scaffold/blogScaffold";
import {
  EVENT_JS_TEMPLATE,
  EVENT_SYSTEM_PROMPT_ADDON,
} from "@/lib/scaffold/eventScaffold";

const anthropic = new Anthropic();

// ── Retry helper ─────────────────────────────────────────────────────────────
// Retries an Anthropic API call up to 2 extra times on 529 (overload) or 503
// errors, with exponential backoff. Other errors are re-thrown immediately so
// the caller can decide whether to use a fallback page.

type AnthropicCreateParams = Parameters<typeof anthropic.messages.create>[0];

async function createWithRetry(
  params: AnthropicCreateParams,
  maxRetries = 2
): Promise<Anthropic.Message> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Cast through unknown: we never pass stream:true so runtime type is always Message,
      // but TypeScript can't narrow the overloaded union without an explicit cast.
      return (await anthropic.messages.create(params)) as unknown as Anthropic.Message;
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
  // Haiku simple pages: 5000 tokens (~300+ lines of HTML)
  // Sonnet complex pages: 12000 tokens (~750+ lines of HTML, prevents truncation)
  // Rich barber/restaurant/portfolio pages with hero + grid + gallery + CTA + footer
  // easily exceed 8000 tokens, causing cut-off sections. 12000 stays well within
  // Vercel's 300s limit: 6 pages × ~25s = 150s + shared assets + validation ≈ 180s.
  return SIMPLE_PAGE_SLUGS.has(slug.toLowerCase()) ? 5000 : 12000;
}

// Maximum pages per generation — prevents prompts like "build an entire SaaS"
// from generating 15+ pages and hitting the 300s Vercel Edge timeout.
const MAX_PAGES = 7;

// ── Scaffold detection ────────────────────────────────────────────────────────
// detectScaffoldType() replaces the old isAppPrompt() / isEcommercePrompt()
// pair with a full ranked classifier covering 9 scaffold types.
// See lib/pipeline/detectScaffoldType.ts for the keyword lists and scoring.

// Static supabase.js template — substituted with real credentials at generation time.
// Talks directly to Supabase REST API (no CDN import needed).
// getCartTotals(promoCode) is the single source of truth for all monetary values.
const SUPABASE_JS_TEMPLATE = `// ============================================================
// supabase.js — BuildFlow E-commerce Data Layer
// Products, cart, promo codes, and orders backed by Supabase.
// Pages must NEVER redeclare these functions or hardcode product arrays.
// ============================================================

const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';

const _h = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function _query(table, params) {
  params = params || '';
  var res = await fetch(SUPABASE_URL + '/rest/v1/' + table + params, { headers: _h });
  if (!res.ok) throw new Error('DB error on ' + table + ': ' + res.statusText);
  return res.json();
}
async function _insert(table, body) {
  var res = await fetch(SUPABASE_URL + '/rest/v1/' + table, { method: 'POST', headers: _h, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('DB insert error on ' + table + ': ' + res.statusText);
  return res.json();
}

// ── Products ──────────────────────────────────────────────────
async function getProducts(category) {
  var params = '?active=eq.true&order=created_at.desc';
  if (category) params += '&category=eq.' + encodeURIComponent(category);
  return _query('products', params);
}
async function getFeaturedProducts(limit) {
  limit = limit || 6;
  return _query('products', '?featured=eq.true&active=eq.true&order=created_at.desc&limit=' + limit);
}
async function searchProducts(query) {
  var q = encodeURIComponent(query);
  return _query('products', '?or=(name.ilike.*' + q + '*,description.ilike.*' + q + '*)&active=eq.true');
}
function getProductImageUrl(product, width, height) {
  width = width || 400; height = height || 300;
  if (product.image_url && product.image_url.startsWith('http')) return product.image_url;
  var seed = (product.category || product.name.split(' ')[0]).toLowerCase().replace(/\\s+/g, '-');
  return 'https://picsum.photos/seed/' + seed + '-' + product.id.slice(0, 6) + '/' + width + '/' + height;
}

// ── Cart (localStorage) ───────────────────────────────────────
var CART_KEY = 'buildflow_cart';
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e) { return []; } }
function _saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); _dispatchCartUpdate(cart); }
function _dispatchCartUpdate(cart) {
  document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart, count: getCartCount(), totals: getCartTotals(null) } }));
}
function addToCart(product, quantity) {
  quantity = quantity || 1;
  var cart = getCart();
  var existing = cart.find(function(i) { return i.id === product.id; });
  if (existing) { existing.quantity += quantity; }
  else { cart.push({ id: product.id, name: product.name, price: product.price, image_url: product.image_url || getProductImageUrl(product), category: product.category, quantity: quantity }); }
  _saveCart(cart);
}
function removeFromCart(productId) { _saveCart(getCart().filter(function(i) { return i.id !== productId; })); }
function updateCartQuantity(productId, quantity) {
  var cart = getCart();
  if (quantity <= 0) { cart = cart.filter(function(i) { return i.id !== productId; }); }
  else { var item = cart.find(function(i) { return i.id === productId; }); if (item) item.quantity = quantity; }
  _saveCart(cart);
}
function clearCart() { _saveCart([]); }
function getCartCount() { return getCart().reduce(function(s, i) { return s + i.quantity; }, 0); }

// getCartTotals is the SINGLE SOURCE OF TRUTH for all monetary values.
// ALWAYS call this function — never compute subtotal/discount/total manually.
function getCartTotals(promoCode) {
  var cart = getCart();
  var subtotal = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
  var discountAmount = 0;
  if (promoCode && promoCode.active) { discountAmount = subtotal * (promoCode.discount_percent / 100); }
  var deliveryFee = subtotal >= 50 ? 0 : 4.99;
  var total = subtotal - discountAmount + deliveryFee;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount: cart.reduce(function(s, i) { return s + i.quantity; }, 0),
  };
}

// Update ALL cart badge elements (use data-cart-count attribute on badge elements)
function updateCartBadges() {
  var c = getCartCount();
  document.querySelectorAll('[data-cart-count]').forEach(function(el) { el.textContent = c; el.style.display = c > 0 ? 'inline-flex' : 'none'; });
}

// ── Promo codes ───────────────────────────────────────────────
async function validatePromoCode(code) {
  try {
    var results = await _query('promo_codes', '?code=eq.' + encodeURIComponent(code.toUpperCase()) + '&active=eq.true&limit=1');
    return results.length ? results[0] : null;
  } catch(e) { return null; }
}

// ── Orders ────────────────────────────────────────────────────
async function createOrder(customerDetails, promoCode) {
  promoCode = promoCode || null;
  var cart = getCart();
  if (!cart.length) throw new Error('Cart is empty');
  var totals = getCartTotals(promoCode);
  var order = {
    customer_name: customerDetails.name,
    customer_email: customerDetails.email,
    delivery_address: customerDetails.address || '',
    items: cart,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    delivery_fee: totals.deliveryFee,
    total: totals.total,
    promo_code: promoCode ? promoCode.code : null,
    status: 'pending',
  };
  var result = await _insert('orders', order);
  clearCart();
  return Array.isArray(result) ? result[0] : result;
}

// Initialise badges when the DOM is ready
document.addEventListener('DOMContentLoaded', function() { updateCartBadges(); });
`;

/**
 * Builds the static supabase.js with real Supabase credentials injected (if available)
 * and calls Claude once to generate the SQL migration with schema + seed data.
 */
async function generateEcommerceFiles(
  siteName: string,
  userPrompt: string,
  dbConnection?: DbConnection | null,
  onProgress?: ProgressCallback
): Promise<{ supabaseJs: string; migrationSql: string }> {
  onProgress?.("generating-data", "Generating product catalogue and database schema...");

  // Inject real credentials if the project has a connected Supabase database
  const supabaseJs = SUPABASE_JS_TEMPLATE
    .replace("'__SUPABASE_URL__'", `'${dbConnection?.supabaseUrl ?? 'YOUR_SUPABASE_URL'}'`)
    .replace("'__SUPABASE_ANON_KEY__'", `'${dbConnection?.supabaseAnonKey ?? 'YOUR_SUPABASE_ANON_KEY'}'`);

  // Generate schema + realistic seed data via Claude
  const migrationSql = await generateEcommerceMigration(siteName, userPrompt);

  return { supabaseJs, migrationSql };
}

/**
 * Calls Claude to generate a complete Supabase SQL migration for the ecommerce site:
 * schema (products / promo_codes / orders tables) + INSERT statements with
 * 8-12 realistic products and 2-3 promo codes matching the brand.
 */
async function generateEcommerceMigration(
  siteName: string,
  userPrompt: string
): Promise<string> {
  const response = await createWithRetry({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    system: `You are generating a Supabase SQL migration for an ecommerce website.
Output ONLY valid SQL — no markdown, no code fences, no explanation.

The SQL must:
1. Create 3 tables (only if they don't exist):
   CREATE TABLE IF NOT EXISTS products (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL,
     category TEXT, image_url TEXT, tags TEXT[], featured BOOLEAN DEFAULT false,
     active BOOLEAN DEFAULT true, stock INT DEFAULT 99,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE TABLE IF NOT EXISTS promo_codes (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     code TEXT UNIQUE NOT NULL, discount_percent INT NOT NULL,
     active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE TABLE IF NOT EXISTS orders (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     customer_name TEXT, customer_email TEXT NOT NULL, delivery_address TEXT,
     items JSONB NOT NULL, subtotal DECIMAL(10,2), discount_amount DECIMAL(10,2) DEFAULT 0,
     delivery_fee DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) NOT NULL,
     promo_code TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now()
   );

2. Enable Row Level Security and public read policies:
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   CREATE POLICY IF NOT EXISTS "Public read products" ON products FOR SELECT USING (true);
   CREATE POLICY IF NOT EXISTS "Public read promos" ON promo_codes FOR SELECT USING (true);
   CREATE POLICY IF NOT EXISTS "Public insert orders" ON orders FOR INSERT WITH CHECK (true);

3. INSERT 8-12 realistic products with real names, descriptions, prices, and categories matching the site theme.
   Use gen_random_uuid() for ids. Set featured=true on the 3 most popular products.
   image_url: use NULL (the JS layer generates picsum URLs from product name/category).

4. INSERT 2-3 brand-appropriate promo codes (e.g. CAKE15, ELITE10, WELCOME20).`,
    messages: [
      {
        role: "user",
        content: `Generate the SQL migration for: "${siteName}"\n\nSite description: ${userPrompt}`,
      },
    ],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  return raw.replace(/^```(?:sql)?\n?/m, "").replace(/\n?```$/m, "").trim();
}

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

export interface DbConnection {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface SiteConfig {
  dbConnection?: DbConnection | null;
  analyticsConfig?: import("@/lib/scaffold/analyticsTemplate").AnalyticsConfig | null;
  consentRequired?: boolean; // auto-detected from ecommerce flag when not set
}

/**
 * Main entry point -- detects mode, generates, validates, fixes blank pages
 */
export async function runGenerationPipeline(
  userPrompt: string,
  siteName: string,
  onProgress?: ProgressCallback,
  onFile?: FileCallback,
  siteConfig?: SiteConfig | DbConnection | null
): Promise<PipelineResult> {
  // Backward-compat: callers that pass a bare DbConnection object still work
  const resolvedConfig: SiteConfig =
    siteConfig && 'supabaseUrl' in siteConfig
      ? { dbConnection: siteConfig as DbConnection }
      : (siteConfig as SiteConfig | null | undefined) ?? {}
  const dbConnection = resolvedConfig.dbConnection ?? null
  const warnings: string[] = [];
  const errors: string[] = [];
  // Track elapsed time so we can skip the auto-regen pass if we're approaching
  // Vercel's 300s function limit. Generation alone can fill 240-280s for large sites,
  // leaving no time for regen API calls. Skipping regen lets `done` fire on time.
  const pipelineStart = Date.now();

  // Step 1: Detect what kind of site to generate
  onProgress?.("detecting", "Analysing your prompt...");
  const detection = detectOutputMode(userPrompt);
  const scaffold = detectScaffoldType(userPrompt);
  const isEcommerce    = scaffold === 'ecommerce';
  const isApp          = scaffold === 'app';
  const isRestaurant   = scaffold === 'restaurant';
  const isSaas         = scaffold === 'saas';
  const isPortfolio    = scaffold === 'portfolio';
  const isProfessional = scaffold === 'professional';
  const isBlog         = scaffold === 'blog';
  const isEvent        = scaffold === 'event';

  // Use scaffold-specific default pages when detectOutputMode finds none
  const detectedPages = detection.pages.length > 0 ? detection.pages : extractPages(userPrompt, detection.mode);
  const pages: DetectedPage[] = detectedPages.length > 0
    ? detectedPages
    : getDefaultPages(scaffold).map(p => ({
        slug: p.slug,
        name: p.name,
        description: p.description,
        routePath: p.slug === 'index' ? 'index.html' : `${p.slug}.html`,
      }));

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

  // Always emit shared JS helpers (zero API calls — pure static templates)
  sharedFiles["auth.js"] = AUTH_JS_TEMPLATE;
  onFile?.("auth.js", AUTH_JS_TEMPLATE);
  sharedFiles["forms.js"] = FORMS_JS_TEMPLATE;
  onFile?.("forms.js", FORMS_JS_TEMPLATE);
  sharedFiles["toast.js"] = TOAST_JS_TEMPLATE;
  onFile?.("toast.js", TOAST_JS_TEMPLATE);

  // Always emit 404.html with real nav + footer so deployed sites have a branded error page
  const page404Html = build404Page(
    siteName,
    sharedFiles["_nav_html"] ?? "",
    sharedFiles["_footer_html"] ?? "",
    pages
  );
  sharedFiles["404.html"] = page404Html;
  onFile?.("404.html", page404Html);

  // Step 2c: Consent + analytics — opt-in, zero extra API calls
  const needsConsent = isEcommerce || !!(resolvedConfig.consentRequired) || !!(resolvedConfig.analyticsConfig);
  if (needsConsent) {
    sharedFiles["consent.js"] = CONSENT_JS_TEMPLATE;
    onFile?.("consent.js", CONSENT_JS_TEMPLATE);
  }
  if (resolvedConfig.analyticsConfig) {
    const analyticsJs = buildAnalyticsJs(resolvedConfig.analyticsConfig);
    sharedFiles["analytics.js"] = analyticsJs;
    onFile?.("analytics.js", analyticsJs);
  }

  // Step 2b: Scaffold-specific file generation — emitted BEFORE pages so every
  // page can reference the shared data-layer module (supabase.js / menu.js / etc.)
  let ecommerceSupabaseJs = "";
  let restaurantMenuJs = "";
  let scaffoldSystemPromptAddon = "";
  if (isEcommerce) {
    const ecomFiles = await generateEcommerceFiles(siteName, userPrompt, dbConnection, onProgress);
    if (ecomFiles.supabaseJs) {
      ecommerceSupabaseJs = ecomFiles.supabaseJs;
      sharedFiles["supabase.js"] = ecomFiles.supabaseJs;
      onFile?.("supabase.js", ecomFiles.supabaseJs);
    }
    if (ecomFiles.migrationSql) {
      sharedFiles["supabase/migrations/001_ecommerce.sql"] = ecomFiles.migrationSql;
      onFile?.("supabase/migrations/001_ecommerce.sql", ecomFiles.migrationSql);
    }
  } else if (isRestaurant) {
    onProgress?.("generating-data", "Generating menu and reservation schema...");
    restaurantMenuJs = RESTAURANT_MENU_JS_TEMPLATE
      .replace("'__SUPABASE_URL__'", `'${dbConnection?.supabaseUrl ?? 'YOUR_SUPABASE_URL'}'`)
      .replace("'__SUPABASE_ANON_KEY__'", `'${dbConnection?.supabaseAnonKey ?? 'YOUR_SUPABASE_ANON_KEY'}'`)
      .replace("'__OPENING_HOURS_JSON__'", `'${JSON.stringify(DEFAULT_OPENING_HOURS)}'`);
    sharedFiles["menu.js"] = restaurantMenuJs;
    onFile?.("menu.js", restaurantMenuJs);
    const menuSql = await generateRestaurantMigration(siteName, userPrompt);
    if (menuSql) {
      sharedFiles["supabase/migrations/001_restaurant.sql"] = menuSql;
      onFile?.("supabase/migrations/001_restaurant.sql", menuSql);
    }
    scaffoldSystemPromptAddon = RESTAURANT_SYSTEM_PROMPT_ADDON;
  } else if (isSaas) {
    sharedFiles["waitlist.js"] = SAAS_WAITLIST_JS_TEMPLATE;
    onFile?.("waitlist.js", SAAS_WAITLIST_JS_TEMPLATE);
    scaffoldSystemPromptAddon = SAAS_SYSTEM_PROMPT_ADDON;
  } else if (isPortfolio) {
    sharedFiles["gallery.js"] = PORTFOLIO_GALLERY_JS_TEMPLATE;
    onFile?.("gallery.js", PORTFOLIO_GALLERY_JS_TEMPLATE);
    scaffoldSystemPromptAddon = PORTFOLIO_SYSTEM_PROMPT_ADDON;
  } else if (isApp) {
    sharedFiles["app.js"] = APP_JS_TEMPLATE;
    onFile?.("app.js", APP_JS_TEMPLATE);
    scaffoldSystemPromptAddon = APP_SYSTEM_PROMPT_ADDON;
  } else if (isProfessional) {
    sharedFiles["professional.js"] = PROFESSIONAL_JS_TEMPLATE;
    onFile?.("professional.js", PROFESSIONAL_JS_TEMPLATE);
    scaffoldSystemPromptAddon = PROFESSIONAL_SYSTEM_PROMPT_ADDON;
  } else if (isBlog) {
    sharedFiles["blog.js"] = BLOG_JS_TEMPLATE;
    onFile?.("blog.js", BLOG_JS_TEMPLATE);
    scaffoldSystemPromptAddon = BLOG_HTML_SYSTEM_PROMPT_ADDON;
  } else if (isEvent) {
    sharedFiles["event.js"] = EVENT_JS_TEMPLATE;
    onFile?.("event.js", EVENT_JS_TEMPLATE);
    scaffoldSystemPromptAddon = EVENT_SYSTEM_PROMPT_ADDON;
  }

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
      page, siteName, userPrompt, pages, sharedFiles, onProgress, dbConnection,
      isEcommerce, ecommerceSupabaseJs,
      scaffold, scaffoldSystemPromptAddon, restaurantMenuJs
    );

    // Keep the raw content (with any truncation marker) in generatedPages so
    // validatePageCompleteness can detect it and schedule regeneration.
    // Strip the internal marker before sending to the client so the preview
    // renders valid HTML even while we queue the regen.
    generatedPages[filename] = pageContent;
    onFile?.(filename, pageContent.replace(/\n?<!-- TRUNCATED_AT_TOKEN_LIMIT -->/g, "")); // fire as each page completes

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

  // Step 6: Regenerate any broken/blank pages — only if time budget allows.
  // Vercel functions cap at 300s. Generation alone can take 240-280s for 5-7 page sites.
  // Attempting regen after a slow generation pushes the total past 300s, causing the
  // function to be killed before the `done` event fires. We leave a 55s buffer:
  //   - 45s for done + DB save on the client side
  //   - 10s safety margin
  const pagesNeedingRegen = validation.pages.filter((p) => p.needsRegeneration);
  const elapsedSeconds = (Date.now() - pipelineStart) / 1000;
  const regenBudgetAvailable = elapsedSeconds < 245; // 300s limit − 55s buffer

  if (pagesNeedingRegen.length > 0 && regenBudgetAvailable) {
    onProgress?.("fixing", `Fixing ${pagesNeedingRegen.length} incomplete page(s)...`);

    for (const brokenPage of pagesNeedingRegen) {
      // Re-check budget before each regen call (each takes ~15-25s)
      const nowElapsed = (Date.now() - pipelineStart) / 1000;
      if (nowElapsed >= 245) {
        warnings.push(
          `${brokenPage.filename}: Time budget exhausted — click Retry to fix (${brokenPage.issues[0]?.message})`
        );
        continue;
      }

      onProgress?.("regenerating", `Regenerating ${brokenPage.filename}...`);
      warnings.push(
        `${brokenPage.filename}: Auto-regenerated -- ${brokenPage.issues[0]?.message}`
      );

      const regenPrompt = buildPageRegenerationPrompt(
        brokenPage.filename, siteName, userPrompt, allFiles
      );

      const fixed = await regeneratePage(brokenPage.filename, regenPrompt);
      if (fixed) {
        // Strip the truncation marker from the regenerated page (belt-and-suspenders)
        const cleaned = fixed.replace(/\n?<!-- TRUNCATED_AT_TOKEN_LIMIT -->/g, "");
        allFiles[brokenPage.filename] = cleaned;
        onFile?.(brokenPage.filename, cleaned);
      }
    }
  } else if (pagesNeedingRegen.length > 0) {
    // Time budget exhausted — warn but still deliver the files we have
    for (const brokenPage of pagesNeedingRegen) {
      warnings.push(
        `${brokenPage.filename}: Needs attention — ${brokenPage.issues[0]?.message}. Click Retry to fix.`
      );
    }
  }

  // Strip truncation markers from any pages that passed validation (weren't regenerated)
  // so the final files object sent to the client is clean.
  for (const filename of Object.keys(allFiles)) {
    if (allFiles[filename].includes("<!-- TRUNCATED_AT_TOKEN_LIMIT -->")) {
      allFiles[filename] = allFiles[filename].replace(/\n?<!-- TRUNCATED_AT_TOKEN_LIMIT -->/g, "");
    }
  }

  // Step 7: Auto-fix structural issues in all HTML pages (zero latency — pure string transforms).
  // Fixes: DOCTYPE, charset, viewport, lang, title, meta description, lazy loading, external link rel.
  // Uses autoFixStructural (not autoFix) to avoid converting onsubmit="handler(event)" which would
  // break the form handler by referencing `event` inside a closure where it is undefined.
  const autoFixer = new CodeAutoFixer();
  for (const filename of Object.keys(allFiles)) {
    if (!filename.endsWith(".html")) continue;
    const result = autoFixer.autoFixStructural(allFiles[filename], allFiles);
    if (result.appliedFixes.length > 0) {
      allFiles[filename] = result.fixed;
      warnings.push(`${filename}: auto-fixed ${result.appliedFixes.length} structural issue(s)`);
    }
  }

  // Step 8: Report missing pages
  for (const missing of validation.missingPages) {
    errors.push(`Page "${missing}" was not generated -- add it manually or regenerate`);
  }

  // Step 9: Compute quality score
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

  const sharedImagePalette = getImagePaletteBlock(userPrompt)

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
      document.addEventListener('click', function(e) { var btn = e.target.closest('[data-action="logout"]'); if (btn) logout(); });
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
       <button data-action="logout" class="text-sm text-gray-500 hover:text-red-600 font-medium">Logout</button>
     </div>` : ""}
   - Style: bg-white shadow-sm sticky top-0 z-50

4. footer_html: A rich Tailwind footer with:
   - 3-column grid: brand blurb | quick links | contact info
   - Social media icon links (SVG icons for Twitter/X, LinkedIn, Instagram)
   - Copyright line
   - Style: bg-gray-900 text-gray-300 py-12

${sharedImagePalette ? `\n${sharedImagePalette}\n` : ''}
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
      max_tokens: 5000,
      system: HTML_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = safeParseJson(text);

    return {
      "style.css": parsed["style.css"] ?? defaultCss(siteName),
      "script.js": appendRevealSafetyNet(parsed["script.js"] ?? defaultJs()),
      "_nav_html": parsed["nav_html"] ?? "",
      "_footer_html": parsed["footer_html"] ?? "",
    };
  } catch {
    return {
      "style.css": defaultCss(siteName),
      "script.js": appendRevealSafetyNet(defaultJs()),
      "_nav_html": "",
      "_footer_html": "",
    };
  }
}

/**
 * Appends a safety-net timeout to any script.js content.
 * Deployed sites can show blank pages if IntersectionObserver never fires
 * (e.g. a JS error earlier in the script prevents DOMContentLoaded from running).
 * This timeout force-shows all .reveal elements after 800ms as a fallback.
 * In the chatbuilder iframe the SANDBOX_INTERCEPTOR already does this on load,
 * but deployed sites (Netlify, Vercel, etc.) need it baked into the script itself.
 */
function appendRevealSafetyNet(script: string): string {
  const safetyNet = `
// Safety net: force-show all .reveal elements after 800 ms.
// Guards against cases where IntersectionObserver doesn't fire on deployed sites
// (e.g. a JS error earlier in the script, or a browser quirk). Content is always
// visible after this delay even if the scroll-reveal animation never ran.
setTimeout(function() {
  document.querySelectorAll('.reveal').forEach(function(el) {
    el.classList.add('visible');
  });
}, 800);`;
  return script + safetyNet;
}

// --- Per-page generation ---

async function generateSinglePage(
  page: DetectedPage,
  siteName: string,
  userPrompt: string,
  allPages: DetectedPage[],
  sharedFiles: Record<string, string>,
  _onProgress?: ProgressCallback,
  dbConnection?: DbConnection | null,
  isEcommerce = false,
  ecommerceSupabaseJs = "",
  scaffold: ReturnType<typeof detectScaffoldType> = "generic",
  scaffoldSystemPromptAddon = "",
  restaurantMenuJs = ""
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

  // Detect site category and build topic-specific image palette
  const imagePalette = getImagePaletteBlock(userPrompt)

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
3. Link before </body> in this EXACT order (all are always present):
   <script src="auth.js"></script>
   <script src="forms.js"></script>
   <script src="toast.js"></script>
   [ecommerce only: <script src="supabase.js"></script>]
   <script src="script.js"></script>
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

${scaffold === 'app' ? `━━━ CONTENT REQUIREMENTS ━━━
This is a FUNCTIONAL WEB APP — build a working interactive interface, not a marketing page.
Data is persisted to a REAL database via the BuildFlow Data API (not localStorage).

1. MAIN APP INTERFACE (REQUIRED — the whole point of this page):
   - Build the COMPLETE, WORKING UI the user described
   - Include ALL interactive elements: forms, inputs, buttons, lists, checkboxes, etc.
   - Use Tailwind for clean, professional styling
   - Wrap the app in: <main class="max-w-2xl mx-auto px-4 py-8"> or appropriate container

2. DATA API — use this EXACT pattern (copy verbatim, change only COLLECTION_NAME):
${dbConnection ? `   The database is a REAL Supabase project. Use the Supabase JS SDK.
   REQUIRED script tag in <head> (load Supabase SDK):
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

   REQUIRED inline script — place AFTER the Supabase SDK script:
   <script>
     var _sb = window.supabase.createClient('${dbConnection.supabaseUrl}', '${dbConnection.supabaseAnonKey}');
     var COLLECTION = '${page.slug}_items';  // Supabase table name
     var items = [];

     // Returns auth headers if the user is logged in
     function getAuthHeaders() {
       var token = localStorage.getItem('auth_token');
       return token ? { Authorization: 'Bearer ' + token } : {};
     }

     async function loadItems() {
       try {
         var { data, error } = await _sb.from(COLLECTION).select('*').order('created_at', { ascending: false });
         if (error) throw error;
         items = (data || []).map(function(r) { return Object.assign({ id: r.id, _createdAt: r.created_at }, r); });
         render();
       } catch(e) { console.error('Load error', e); }
     }

     async function saveItem(itemData) {
       try {
         var { data, error } = await _sb.from(COLLECTION).insert([itemData]).select().single();
         if (error) throw error;
         items.unshift(Object.assign({ id: data.id, _createdAt: data.created_at }, data));
         render();
       } catch(e) { console.error('Save error', e); }
     }

     async function updateItem(id, changes) {
       try {
         var { error } = await _sb.from(COLLECTION).update(changes).eq('id', id);
         if (error) throw error;
         var idx = items.findIndex(function(i) { return i.id === id; });
         if (idx !== -1) { Object.assign(items[idx], changes); render(); }
       } catch(e) { console.error('Update error', e); }
     }

     async function deleteItem(id) {
       try {
         var { error } = await _sb.from(COLLECTION).delete().eq('id', id);
         if (error) throw error;
         items = items.filter(function(i) { return i.id !== id; });
         render();
       } catch(e) { console.error('Delete error', e); }
     }
   </script>` : `   The API endpoint is: /api/public/data/BUILDFLOW_PROJECT_ID
   Collection name should describe the data (e.g. "tasks", "notes", "inventory").

   REQUIRED inline script — place BEFORE all other scripts in <head>:
   <script>
     var DATA_API = '/api/public/data/BUILDFLOW_PROJECT_ID';
     var COLLECTION = '${page.slug}_items';  // unique per page/entity type
     var items = [];

     // Returns auth headers if the user is logged in (token from /api/public/auth/)
     function getAuthHeaders() {
       var token = localStorage.getItem('auth_token');
       return token
         ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
         : { 'Content-Type': 'application/json' };
     }

     // Load all records from the database (scoped to logged-in user if authenticated)
     async function loadItems() {
       try {
         var res = await fetch(DATA_API + '?collection=' + COLLECTION, { headers: getAuthHeaders() });
         var d = await res.json();
         items = (d.records || []).map(function(r) {
           return Object.assign({ id: r.id, _createdAt: r.createdAt }, r.data);
         });
         render();
       } catch(e) { console.error('Load error', e); }
     }

     // Create a new record (pass an object WITHOUT id)
     async function saveItem(itemData) {
       try {
         var res = await fetch(DATA_API, {
           method: 'POST',
           headers: getAuthHeaders(),
           body: JSON.stringify({ collection: COLLECTION, data: itemData })
         });
         var d = await res.json();
         if (d.record) {
           items.unshift(Object.assign({ id: d.record.id, _createdAt: d.record.createdAt }, d.record.data));
           render();
         }
       } catch(e) { console.error('Save error', e); }
     }

     // Update an existing record by id (pass only changed fields)
     async function updateItem(id, changes) {
       try {
         await fetch(DATA_API + '?id=' + id, {
           method: 'PATCH',
           headers: getAuthHeaders(),
           body: JSON.stringify({ data: changes })
         });
         var idx = items.findIndex(function(i) { return i.id === id; });
         if (idx !== -1) { Object.assign(items[idx], changes); render(); }
       } catch(e) { console.error('Update error', e); }
     }

     // Delete a record by id
     async function deleteItem(id) {
       try {
         await fetch(DATA_API + '?id=' + id, { method: 'DELETE', headers: getAuthHeaders() });
         items = items.filter(function(i) { return i.id !== id; });
         render();
       } catch(e) { console.error('Delete error', e); }
     }
   </script>`}

3. FILE UPLOADS (use ONLY when the page needs image/file upload):
   - Upload endpoint: POST /api/public/upload/BUILDFLOW_PROJECT_ID (multipart/form-data, field name "file")
   - Allowed types: JPEG, PNG, GIF, WebP, SVG, PDF, CSV, TXT (max 4.5 MB)
   - Returns: { url, filename, size, mimeType } — use url to display or store in saveItem()
   - Example:
     async function uploadFile(file) {
       var fd = new FormData(); fd.append('file', file);
       var res = await fetch('/api/public/upload/BUILDFLOW_PROJECT_ID', { method: 'POST', body: fd });
       var d = await res.json(); return d.url;
     }
   - Only include this if the page actually has a file/image upload requirement.

4. JAVASCRIPT FUNCTIONALITY — everything must actually work:
   - Call loadItems() on DOMContentLoaded — it fetches from the real database and calls render()
   - Use saveItem({...}) to create records (do NOT pass id — the server assigns it)
   - Use updateItem(id, {...}) for edits (only changed fields needed)
   - Use deleteItem(id) to remove records
   - Re-render from the items array on every change:
     function render() { list.innerHTML = ''; items.forEach(function(item) { /* build DOM from item */ }); }
   - Show a loading indicator while loadItems() is in-flight
   - Pre-populate with 2-3 example items on FIRST LOAD only (check items.length === 0 after loadItems resolves)

5. ADD / CREATE functionality (if applicable):
   - Input field + button that calls addItem() on click AND on Enter key:
     async function addItem() {
       var val = document.getElementById('item-input').value.trim();
       if (!val) return;
       await saveItem({ text: val, done: false });
       document.getElementById('item-input').value = '';
     }

6. DELETE / REMOVE functionality (if applicable):
   - Each item gets a delete button with data-id attribute (NO onclick):
     <button data-id="ITEM_ID" class="delete-btn" ...>×</button>
   - Use event delegation (set up once in DOMContentLoaded, survives re-renders):
     list.addEventListener('click', function(e) {
       var btn = e.target.closest('.delete-btn');
       if (btn) deleteItem(btn.dataset.id);
     });

7. SCROLL ANIMATIONS:
   - Add class="reveal" to major section divs (the app container, any stats sections)

8. HEADER (optional, brief):
   - A simple app header/title is fine — skip hero images and marketing copy` : `━━━ CONTENT REQUIREMENTS ━━━
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

5. MINIMUM CONTENT: 600+ words of visible body text (excluding nav/footer)`}

${page.slug === "contact" ? `
CONTACT FORM REQUIREMENTS (this form submits to a REAL backend):
- Use this EXACT form tag — do not change the onsubmit:
  <form id="contact-form" onsubmit="handleFormSubmit(event)" class="space-y-6 max-w-lg mx-auto">
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
    <button type="submit" id="contact-submit-btn" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition">Send Message</button>
  </form>
- Immediately after the </form>, add the hidden success state:
  <div id="form-success" style="display:none" class="text-center py-16">
    <div class="text-6xl mb-4">✅</div>
    <h3 class="text-2xl font-bold text-green-600 mb-2">Message Sent!</h3>
    <p class="text-gray-500">We'll get back to you within 24 hours.</p>
  </div>
- Add this EXACT script just before </body> — do not modify it:
  <script>
    async function handleFormSubmit(e) {
      e.preventDefault();
      var btn = document.getElementById('contact-submit-btn');
      var form = document.getElementById('contact-form');
      var successEl = document.getElementById('form-success');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      var fd = new FormData(form);
      var formData = {};
      fd.forEach(function(v, k) { formData[k] = v; });
      try {
        var res = await fetch('/api/public/email/BUILDFLOW_PROJECT_ID', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            subject: formData.subject || 'Contact form submission',
            message: formData.message || '',
            from: formData.email || '',
            name: formData.name || '',
            formType: 'contact'
          })
        });
        if (!res.ok) {
          var err = await res.json();
          throw new Error(err.error || 'Submission failed');
        }
        form.style.display = 'none';
        successEl.style.display = 'block';
      } catch(err) {
        btn.disabled = false;
        btn.textContent = 'Send Message';
        alert('Sorry, there was an error sending your message. Please try again.');
      }
    }
  </script>
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

${imagePalette ? `\n${imagePalette}\n` : ''}${isEcommerce && ecommerceSupabaseJs ? `
## Shared supabase.js module (already generated — do NOT redeclare any of these functions)
Link before </body> in order: auth.js → forms.js → toast.js → supabase.js → script.js → any inline <script>.
All cart and data operations MUST use these functions — never redeclare or duplicate them:
- getProducts(category?)   — async, returns product array from database
- getFeaturedProducts(n?)  — async, returns featured products
- getCart()                — sync, returns current cart array (from localStorage)
- addToCart(product, qty?) — sync, adds/increments item, fires cart:updated event
- removeFromCart(id)       — sync, removes item, fires cart:updated event
- updateCartQuantity(id, qty) — sync, sets quantity (removes if ≤0), fires cart:updated event
- getCartCount()           — sync, total items in cart (sum of quantities)
- getCartTotals(promoCode) — sync, SINGLE SOURCE OF TRUTH for all monetary values
                             returns { subtotal, discountAmount, deliveryFee, total, itemCount }
                             ALWAYS use this — never compute subtotal/total manually
- updateCartBadges()       — sync, updates all [data-cart-count] elements
- validatePromoCode(code)  — async, returns promo object { code, discount_percent, active } or null
- createOrder(customerDetails, promoCode?) — async, saves order to DB, clears cart, returns order object
- getProductImageUrl(product, w?, h?) — returns image URL (stored URL or picsum fallback)

Use [data-cart-count] attribute on ALL cart badge elements.
Listen to 'cart:updated' event to reactively update the UI:
  document.addEventListener('cart:updated', function(e) { renderCart(); });
` : ''}${['cart', 'basket', 'checkout'].includes(page.slug.toLowerCase()) && isEcommerce ? `
## CART / BASKET PAGE — CRITICAL REQUIREMENTS

This is the shopping cart page. ALL interactions MUST work. Use this EXACT script pattern:

REQUIRED SCRIPT (place just before </body>, after auth.js/forms.js/toast.js/supabase.js):
<script>
  var _appliedPromo = null;

  function renderCart() {
    var cart = getCart();
    var list = document.getElementById('cart-items');
    var emptyMsg = document.getElementById('cart-empty');
    var cartSummary = document.getElementById('cart-summary');
    if (!list) return;

    if (cart.length === 0) {
      list.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (cartSummary) cartSummary.style.display = 'none';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';

    list.innerHTML = cart.map(function(item) {
      var img = item.image_url || getProductImageUrl(item);
      return '<div class="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm mb-3" data-item-id="' + item.id + '">' +
        '<img src="' + img + '" alt="' + item.name + '" class="w-20 h-20 object-cover rounded-lg">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="font-semibold text-gray-900">' + item.name + '</p>' +
          '<p class="text-indigo-600 font-bold">£' + item.price.toFixed(2) + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<button class="qty-minus w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold" data-id="' + item.id + '">−</button>' +
          '<span class="w-8 text-center font-semibold">' + item.quantity + '</span>' +
          '<button class="qty-plus w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold" data-id="' + item.id + '">+</button>' +
        '</div>' +
        '<button class="remove-item ml-4 text-red-500 hover:text-red-700 text-sm font-medium" data-id="' + item.id + '">Remove</button>' +
      '</div>';
    }).join('');

    renderOrderSummary();
  }

  function renderOrderSummary() {
    // ALWAYS use getCartTotals() — never compute manually
    var t = getCartTotals(_appliedPromo);
    var el = function(id) { return document.getElementById(id); };
    if (el('summary-count'))    el('summary-count').textContent    = t.itemCount + ' item' + (t.itemCount !== 1 ? 's' : '');
    if (el('summary-subtotal')) el('summary-subtotal').textContent = '£' + t.subtotal.toFixed(2);
    if (el('summary-discount')) el('summary-discount').textContent = t.discountAmount > 0 ? '-£' + t.discountAmount.toFixed(2) : '£0.00';
    if (el('summary-delivery')) el('summary-delivery').textContent = t.deliveryFee === 0 ? 'FREE' : '£' + t.deliveryFee.toFixed(2);
    if (el('summary-total'))    el('summary-total').textContent    = '£' + t.total.toFixed(2);
  }

  document.addEventListener('DOMContentLoaded', function() {
    renderCart();

    // Reactively re-render when cart changes (fired by supabase.js on every mutation)
    document.addEventListener('cart:updated', function() { renderCart(); });

    // Event delegation for +/−/remove buttons (survives re-render)
    var list = document.getElementById('cart-items');
    if (list) {
      list.addEventListener('click', function(e) {
        var plus   = e.target.closest('.qty-plus');
        var minus  = e.target.closest('.qty-minus');
        var remove = e.target.closest('.remove-item');
        if (plus)   { var c = getCart(); var i = c.find(function(x){ return x.id === plus.dataset.id; }); if (i) updateCartQuantity(plus.dataset.id, i.quantity + 1); }
        if (minus)  { var c2 = getCart(); var i2 = c2.find(function(x){ return x.id === minus.dataset.id; }); if (i2) updateCartQuantity(minus.dataset.id, Math.max(1, i2.quantity - 1)); }
        if (remove) { removeFromCart(remove.dataset.id); }
      });
    }

    // Promo code — validatePromoCode is async (hits Supabase promo_codes table)
    var promoBtn = document.getElementById('apply-promo');
    if (promoBtn) {
      promoBtn.addEventListener('click', async function() {
        var input = document.getElementById('promo-input');
        var msg   = document.getElementById('promo-message');
        if (!input) return;
        promoBtn.disabled = true; promoBtn.textContent = 'Checking...';
        var result = await validatePromoCode(input.value.trim());
        promoBtn.disabled = false; promoBtn.textContent = 'Apply';
        _appliedPromo = result;
        if (result) {
          if (msg) { msg.textContent = '✓ ' + result.discount_percent + '% off applied!'; msg.className = 'text-sm text-green-600 mt-1'; }
        } else {
          if (msg) { msg.textContent = 'Invalid or expired promo code.'; msg.className = 'text-sm text-red-500 mt-1'; }
        }
        renderOrderSummary();
      });
    }

    // Checkout — createOrder persists to Supabase orders table and clears the cart
    var checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async function() {
        if (getCartCount() === 0) { alert('Your cart is empty.'); return; }
        checkoutBtn.disabled = true; checkoutBtn.textContent = 'Processing...';
        try {
          var order = await createOrder({ name: 'Guest', email: 'guest@example.com', address: '' }, _appliedPromo);
          var confirmEl  = document.getElementById('order-confirmation');
          var orderIdEl  = document.getElementById('order-id');
          if (orderIdEl) orderIdEl.textContent = '#' + String(order.id).slice(0, 8).toUpperCase();
          if (confirmEl) confirmEl.style.display = 'block';
          var cartSection = document.getElementById('cart-section');
          if (cartSection) cartSection.style.display = 'none';
        } catch(err) {
          alert('Checkout failed. Please try again.');
          checkoutBtn.disabled = false; checkoutBtn.textContent = 'Proceed to Checkout';
        }
      });
    }
  });
</script>

REQUIRED HTML structure for this page:
- A <div id="cart-section"> wrapping the cart items + order summary (hidden on checkout success)
- A <div id="cart-items"> inside cart-section for the item list (populated by renderCart())
- A <div id="cart-empty" style="display:none"> shown when cart is empty
- A <div id="cart-summary"> inside cart-section with:
    - <span id="summary-count"></span> item count
    - <span id="summary-subtotal"></span>
    - <span id="summary-discount"></span>
    - <span id="summary-delivery"></span>
    - <span id="summary-total"></span>
    - <input id="promo-input" placeholder="e.g. SAVE10"> + <button id="apply-promo">Apply</button>
    - <p id="promo-message"></p>
    - <button id="checkout-btn">Proceed to Checkout</button>
- A <div id="order-confirmation" style="display:none"> success panel with <span id="order-id"></span>
DO NOT put inline onclick handlers on any element — the script above uses event delegation.
` : ''}
${scaffoldSystemPromptAddon}
${scaffold === 'restaurant' && restaurantMenuJs ? `
## Shared menu.js module (already generated — do NOT redeclare any function)
Include <script src="menu.js"></script> BEFORE all other scripts.
Available functions: getMenuItems(category?), getFeaturedDishes(limit?), getMenuCategories(),
renderMenuItems(container, items, filters), initDietaryFilters(allItems), initCategoryTabs(),
createReservation(data), getTodayHours(), isOpenNow(), updateOpenStatus()
` : ''}
${scaffold === 'saas' ? `
## Shared waitlist.js module (already generated — do NOT redeclare any function)
Include <script src="waitlist.js"></script> BEFORE all other scripts.
Available functions: joinWaitlist(email, meta?), getWaitlistCount(), updateWaitlistCountDisplay(),
initWaitlistForm(), initPricingToggle(), hasJoinedWaitlist(), voteForFeature(featureId, name)
` : ''}
${scaffold === 'portfolio' ? `
## Shared gallery.js module (already generated — do NOT redeclare any function)
Include <script src="gallery.js"></script> BEFORE all other scripts.
Available functions: openLightbox(galleryId, index), closeLightbox(),
initGallery(), initProjectFilter(), initProjectReveal() — all called automatically on DOMContentLoaded.
` : ''}
${scaffold === 'app' ? `
## Shared app.js module (already generated — do NOT redeclare any function)
Include <script src="app.js"></script> BEFORE all other scripts.
Available functions: showToast(message, type?, duration?), openModal(id), closeModal(id),
lsGet(key, default?), lsSet(key, value), lsRemove(key), lsClear(),
validateForm(form), showFormErrors(form, errors),
setButtonLoading(btn, text?), restoreButton(btn, text?),
on(event, handler), emit(event, data?), once(event, handler)
` : ''}
${scaffold === 'professional' ? `
## Shared professional.js module (already generated — do NOT redeclare any function)
Include <script src="professional.js"></script> BEFORE all other scripts.
Available functions: submitEnquiry(data), initEnquiryForm(),
initTestimonialsCarousel(interval?), initAccordionFAQ(allowMultiple?),
initCredentialReveal(), initStickyCTA(text?, href?, showAfterPx?)
` : ''}
${scaffold === 'blog' ? `
## Shared blog.js module (already generated — do NOT redeclare any function)
Include <script src="blog.js"></script> BEFORE all other scripts.
Available functions: subscribeNewsletter(email), initNewsletterForm(),
initArticleSearch(), initCategoryFilter(), initReadingTime(selector?, wpm?),
initReadingProgress(), initArticleReveal(), initCardReadingTimes(), initCopyLink()
` : ''}
${scaffold === 'event' ? `
## Shared event.js module (already generated — do NOT redeclare any function)
Include <script src="event.js"></script> BEFORE all other scripts.
Available functions: registerForEvent(data), initRegistrationForm(),
initCountdown(targetDate, selector?), initScheduleFilter(),
initSpeakerReveal(), initSessionBookmarks()
` : ''}
${scaffold === 'restaurant' && page.slug === 'reservations' ? RESERVATION_PAGE_SCRIPT : ''}
${scaffold === 'saas' && page.slug === 'pricing' ? SAAS_PRICING_PAGE_SCRIPT : ''}
Output ONLY the HTML file starting with <!DOCTYPE html>:`;

  try {
    const response = await createWithRetry({
      model: pageModel(page.slug),
      max_tokens: pageMaxTokens(page.slug),
      system: HTML_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const wasTruncated = response.stop_reason === "max_tokens";

    // Extract HTML if wrapped in code block
    const htmlMatch =
      text.match(/```html\n?([\s\S]*?)```/) ?? text.match(/(<!DOCTYPE[\s\S]*)/i);
    let html = (htmlMatch ? (htmlMatch[1] ?? htmlMatch[0]) : text).trim();

    if (wasTruncated) {
      // Close any unclosed tags so the browser can at least render what was generated
      if (!html.toLowerCase().includes("</body>")) html += "\n</body>";
      if (!html.toLowerCase().includes("</html>")) html += "\n</html>";
      // Embed a marker so the validator can detect and schedule regeneration
      html += "\n<!-- TRUNCATED_AT_TOKEN_LIMIT -->";
    }

    return html;
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
  // Critical errors (JSX in HTML, truncated output): heavier penalty
  score -= validation.criticalErrors.filter((e) => e.includes("JSX") || e.includes("truncated") || e.includes("TRUNCATED")).length * 20;
  // Other critical errors: moderate penalty
  const otherCritical = validation.criticalErrors.filter((e) => !e.includes("JSX") && !e.includes("truncated") && !e.includes("TRUNCATED") && !e.includes("empty"));
  score -= otherCritical.length * 8;
  // Missing pages are a real problem
  score -= validation.missingPages.length * 10;
  // Empty pages: lighter penalty — the threshold detection is deliberately conservative
  // so a small number of borderline-empty pages should not tank the whole score.
  score -= validation.pages.filter((p) => p.isEmpty).length * 5;
  // JSX components inside HTML files: render as blank — penalise heavily
  score -= validation.pages.filter((p) => p.hasJsxComponents).length * 20;
  // Bonus: all expected pages present with real content
  if (validation.pages.length > 0 && validation.pages.every((p) => p.hasRealContent)) {
    score = Math.min(100, score + 5);
  }
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
}

// Safety net: force-show .reveal elements after 800ms in case IntersectionObserver
// didn't fire (prevents blank pages on deployed sites due to JS errors or browser quirks)
setTimeout(function() {
  document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('visible'); });
}, 800);`;
}
