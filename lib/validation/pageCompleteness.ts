// lib/validation/pageCompleteness.ts
// Detects blank pages, JSX-in-HTML bugs, and missing pages BEFORE saving to DB
// This catches all three bugs visible in the screenshots

export interface PageCompletenessResult {
  passed: boolean;
  pages: PageCheckResult[];
  missingPages: string[];
  criticalErrors: string[];
}

export interface PageCheckResult {
  filename: string;
  contentLength: number;
  issues: PageIssue[];
  isEmpty: boolean;
  hasJsxComponents: boolean;
  hasRealContent: boolean;
  needsRegeneration: boolean;
}

export interface PageIssue {
  severity: "critical" | "warning";
  code: string;
  message: string;
}

// Minimum content length for a page to be considered "populated"
// A real page should have substantial HTML -- empty template = ~500 chars
const MIN_CONTENT_LENGTH = 800;
const MIN_BODY_TEXT = 200; // Text visible to user (not tags/code)

/**
 * Check all generated pages for completeness before showing to user
 */
export function validatePageCompleteness(
  files: Record<string, string>,
  expectedPages: string[] // e.g. ["index.html", "about.html", "contact.html"]
): PageCompletenessResult {
  const criticalErrors: string[] = [];
  const pageResults: PageCheckResult[] = [];

  // Check which expected pages are missing entirely
  const missingPages = expectedPages.filter((p) => !files[p]);

  // Check each HTML file that was generated
  const htmlFiles = Object.entries(files).filter(([path]) => path.endsWith(".html"));

  for (const [filename, content] of htmlFiles) {
    const result = checkSinglePage(filename, content);
    pageResults.push(result);

    if (result.hasJsxComponents) {
      criticalErrors.push(
        `${filename}: Contains JSX component tags (${getJsxComponents(content).join(", ")}) -- will not render in browser`
      );
    }
    if (result.isEmpty) {
      criticalErrors.push(`${filename}: Page is empty or has no real content`);
    }
  }

  return {
    passed: criticalErrors.length === 0 && missingPages.length === 0,
    pages: pageResults,
    missingPages,
    criticalErrors,
  };
}

function checkSinglePage(filename: string, content: string): PageCheckResult {
  const issues: PageIssue[] = [];

  // 1. JSX component tags in HTML (the screenshot bug)
  const jsxComponents = getJsxComponents(content);
  if (jsxComponents.length > 0) {
    issues.push({
      severity: "critical",
      code: "JSX_IN_HTML",
      message: `Found React component tags: ${jsxComponents.join(", ")} -- these render as blank in browsers`,
    });
  }

  // 2. Empty/blank page detection
  const bodyText = extractVisibleText(content);
  const isEmpty = bodyText.length < MIN_BODY_TEXT || content.length < MIN_CONTENT_LENGTH;
  if (isEmpty) {
    issues.push({
      severity: "critical",
      code: "EMPTY_PAGE",
      message: `Page has insufficient content (${bodyText.length} chars of visible text, minimum ${MIN_BODY_TEXT})`,
    });
  }

  // 3. Lone ">" character (broken JSX template literal artifact)
  if (/^>\s*$/m.test(content)) {
    issues.push({
      severity: "critical",
      code: "TEMPLATE_ARTIFACT",
      message: "Stray '>' character detected -- JSX template literal leaked into HTML",
    });
  }

  // 4. Missing DOCTYPE
  if (!content.trim().startsWith("<!DOCTYPE")) {
    issues.push({
      severity: "critical",
      code: "MISSING_DOCTYPE",
      message: "Missing <!DOCTYPE html> -- incomplete HTML document",
    });
  }

  // 5. Broken navigation links
  const hrefMatches = [...content.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const brokenLinks = hrefMatches.filter(
    (h) => h.endsWith(".tsx") || h.endsWith(".jsx") || h === "/"
  );
  if (brokenLinks.length > 0) {
    issues.push({
      severity: "warning",
      code: "WRONG_LINKS",
      message: `Navigation links use wrong format for HTML site: ${brokenLinks.slice(0, 3).join(", ")}`,
    });
  }

  // 6. Lorem ipsum
  if (/lorem ipsum/i.test(content)) {
    issues.push({
      severity: "warning",
      code: "LOREM_IPSUM",
      message: "Placeholder lorem ipsum text found -- replace with real content",
    });
  }

  // 7. Placeholder images with no real src
  const brokenImages = [...content.matchAll(/<img[^>]*src=["']([^"']*?)["']/g)]
    .filter((m) => m[1] === "" || m[1] === "#" || m[1] === "placeholder")
    .length;
  if (brokenImages > 0) {
    issues.push({
      severity: "warning",
      code: "BROKEN_IMAGES",
      message: `${brokenImages} image(s) with empty or invalid src`,
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;

  return {
    filename,
    contentLength: content.length,
    issues,
    isEmpty,
    hasJsxComponents: jsxComponents.length > 0,
    hasRealContent: bodyText.length >= MIN_BODY_TEXT && jsxComponents.length === 0,
    needsRegeneration: criticalCount > 0,
  };
}

// --- Auto-fixers ---

/**
 * Fix JSX component tags in HTML by replacing them with placeholder HTML
 * This is a last-resort fix -- the proper fix is regeneration
 */
export function fixJsxInHtml(content: string, _siteName: string): string {
  // Replace self-closing JSX component tags with empty divs (flagged for regeneration)
  let fixed = content.replace(
    /<([A-Z][A-Za-z]+)\s*\/>/g,
    (_, name) => `<!-- TODO: ${name} component was not rendered -- regenerate this page -->`
  );

  // Replace paired JSX component tags
  fixed = fixed.replace(
    /<([A-Z][A-Za-z]+)([^>]*)>(.*?)<\/\1>/gs,
    (_, name) => `<!-- TODO: ${name} component was not rendered -->`
  );

  // Replace stray > artifacts from JSX
  fixed = fixed.replace(/^>\s*$/gm, "");

  return fixed;
}

/**
 * Build a regeneration prompt for a specific blank/broken page
 */
export function buildPageRegenerationPrompt(
  filename: string,
  siteName: string,
  fullPrompt: string,
  otherPages: Record<string, string>
): string {
  // Get the shared CSS so the regenerated page matches the design
  const sharedCss = otherPages["style.css"] ?? "";
  const indexHtml = otherPages["index.html"] ?? "";

  // Extract nav HTML from index to reuse
  const navMatch = indexHtml.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  const navHtml = navMatch ? `<nav>${navMatch[1]}</nav>` : "";

  const footerMatch = indexHtml.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  const footerHtml = footerMatch ? `<footer>${footerMatch[1]}</footer>` : "";

  const pageName = filename.replace(".html", "").replace("index", "Home");

  return `Regenerate the "${pageName}" page for a website called "${siteName}".

ORIGINAL USER REQUEST:
${fullPrompt}

CRITICAL RULES:
- Output ONLY a complete <!DOCTYPE html> HTML file
- DO NOT use JSX, React components, or <ComponentName /> tags
- Every section must have REAL text content -- not empty divs
- Use the SAME design/colors as the shared CSS below
- Include the same navigation and footer as shown below

REUSE THIS NAVIGATION (copy exactly):
${navHtml || `<nav><a href="index.html">${siteName}</a></nav>`}

REUSE THIS FOOTER (copy exactly):
${footerHtml || `<footer><p>&copy; 2024 ${siteName}</p></footer>`}

SHARED CSS (link to it: <link rel="stylesheet" href="style.css">):
${sharedCss.slice(0, 2000)}...

This page MUST contain at minimum:
- A hero/header section for the ${pageName} page with a real headline
- At least 3 main content sections with real text/cards/lists
- The same navigation and footer as all other pages
- All interactive elements (forms, filters, etc.) requested in the original prompt

Output ONLY the complete HTML file. Nothing else.`;
}

// --- Helpers ---

function getJsxComponents(content: string): string[] {
  // Detect self-closing JSX tags: <ComponentName /> or <ComponentName/>
  const selfClosing = [...content.matchAll(/<([A-Z][A-Za-z0-9]+)\s*\/>/g)].map((m) => m[1]);
  // Detect opening JSX tags: <ComponentName prop="...">
  const opening = [...content.matchAll(/<([A-Z][A-Za-z0-9]+)[\s>]/g)]
    .map((m) => m[1])
    .filter((name) => !["DOCTYPE"].includes(name));

  return [...new Set([...selfClosing, ...opening])];
}

function extractVisibleText(html: string): string {
  // Remove script, style, head blocks
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  return text;
}
