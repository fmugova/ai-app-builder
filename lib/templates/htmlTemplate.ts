/**
 * HTML Template Wrapper
 * Guarantees valid HTML structure with all required elements
 * Used as final layer of defense for validation compliance
 */

export function wrapWithValidHTML(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForMeta(title)} - Professional web experience">
  <title>${sanitizeForTitle(title)}</title>
  <style>
    :root {
      --primary: #3b82f6;
      --secondary: #8b5cf6;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --bg: #ffffff;
      --bg-secondary: #f9fafb;
      --border: #e5e7eb;
      --spacing: 1rem;
      --radius: 0.5rem;
      --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--text);
      background: var(--bg);
      line-height: 1.6;
    }

    ${extractStyleContent(content)}
  </style>
</head>
<body>
  ${ensureH1(content, title)}
  
  ${extractScripts(content)}
</body>
</html>`;
}

/**
 * Extract CSS content from style tags
 */
function extractStyleContent(html: string): string {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1] : '';
}

/**
 * Ensure h1 tag exists in content
 * If missing, adds it in a header element
 */
function ensureH1(html: string, fallbackTitle: string): string {
  // Check if h1 already exists
  if (html.includes('<h1')) {
    return extractBodyContent(html);
  }
  
  // Add h1 in header
  const bodyContent = extractBodyContent(html);
  return `<header>
  <h1>${sanitizeForTitle(fallbackTitle)}</h1>
</header>
${bodyContent}`;
}

/**
 * Extract body content (excluding style and script tags)
 */
function extractBodyContent(html: string): string {
  // Remove doctype, html, head, body tags
  let content = html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
    .replace(/<body[^>]*>/i, '')
    .replace(/<\/body>/i, '');
  
  // Remove style tags (already extracted)
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove script tags (will be added at end)
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  return content.trim();
}

/**
 * Extract script tags from HTML
 */
function extractScripts(html: string): string {
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
  return scripts ? scripts.join('\n  ') : '';
}

/**
 * Sanitize string for use in title tag
 */
function sanitizeForTitle(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 60); // Keep titles reasonable length
}

/**
 * Sanitize string for use in meta tags
 */
function sanitizeForMeta(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 160); // Meta descriptions should be ~155 chars
}

/**
 * Extract title from HTML content
 * Priority: <title> tag > <h1> tag > fallback
 */
function extractTitle(html: string, fallback: string = 'Web Application'): string {
  // Try title tag first
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1].trim()) {
    return titleMatch[1].trim();
  }
  
  // Try h1 tag
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    // Remove any HTML tags from h1 content
    return h1Match[1].replace(/<[^>]*>/g, '').trim();
  }
  
  return fallback;
}

/**
 * Check if content already has valid HTML structure
 * If yes, return as-is. If no, wrap it.
 */
export function ensureValidHTML(content: string, title: string): string {
  console.log('🛡️ TEMPLATE WRAPPER: Checking HTML structure...');
  
  const hasDoctype = /<!DOCTYPE/i.test(content);
  const hasHtml = /<html/i.test(content);
  const hasHead = /<head/i.test(content);
  const hasCharset = /<meta[^>]*charset/i.test(content);
  const hasViewport = /<meta[^>]*viewport/i.test(content);
  const hasH1 = /<h1/i.test(content);
  const hasTitle = /<title/i.test(content);
  const hasMetaDesc = /<meta[^>]*name="description"/i.test(content);
  const hasLang = /<html[^>]*lang=/i.test(content);
  
  console.log('📋 Structure check:', {
    doctype: hasDoctype,
    html: hasHtml,
    head: hasHead,
    charset: hasCharset,
    viewport: hasViewport,
    lang: hasLang,
    title: hasTitle,
    metaDesc: hasMetaDesc,
    h1: hasH1
  });
  
  // If all critical elements exist, return as-is
  if (hasDoctype && hasHtml && hasHead && hasCharset && hasViewport && hasH1 && hasLang) {
    console.log('✅ All critical elements present - no wrapper needed');
    return content;
  }
  
  // Otherwise, wrap with template to guarantee compliance
  const missingElements = [];
  if (!hasDoctype) missingElements.push('DOCTYPE');
  if (!hasHtml) missingElements.push('html tag');
  if (!hasHead) missingElements.push('head');
  if (!hasCharset) missingElements.push('charset');
  if (!hasViewport) missingElements.push('viewport');
  if (!hasLang) missingElements.push('lang attribute');
  if (!hasTitle) missingElements.push('title');
  if (!hasMetaDesc) missingElements.push('meta description');
  if (!hasH1) missingElements.push('h1');
  
  console.log('🔥 APPLYING TEMPLATE WRAPPER (LAST RESORT)');
  console.log('⚠️ Missing elements:', missingElements.join(', '));
  
  // Extract or use provided title
  const extractedTitle = extractTitle(content, title);
  console.log('🎯 Extracted title:', extractedTitle);
  
  const wrapped = wrapWithValidHTML(content, extractedTitle);
  console.log('✅ Template wrapper applied successfully');
  console.log('📏 Wrapped HTML length:', wrapped.length);
  
  return wrapped;
}
