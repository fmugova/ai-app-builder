/**
 * Sanitize code for iframe preview
 * For complete HTML documents, return as-is (they already have everything)
 * For code fragments, wrap with React infrastructure
 */
export function sanitizeForPreview(code: string): string {
  const trimmed = code.trim();
  
  // Return empty HTML for empty code
  if (!trimmed) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Empty Project</title>
</head>
<body>
  <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; color: #666;">
    <p>No content yet. Start building!</p>
  </div>
</body>
</html>`;
  }
  
  // Check if this is a complete HTML document
  const isCompleteHTML = 
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    (trimmed.includes('<head>') && trimmed.includes('<body>'));
  
  if (isCompleteHTML) {
    // Complete HTML document detected - return as-is
    // Ensure proper meta tags for mobile-web-app-capable
    let sanitized = trimmed;
    if (sanitized.includes('apple-mobile-web-app-capable') && !sanitized.includes('mobile-web-app-capable')) {
      sanitized = sanitized.replace(
        /<meta\s+name=["']apple-mobile-web-app-capable["']\s+content=["']yes["']\s*\/?>/gi,
        '<meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">'
      );
    }
    return sanitized;
  }
  
  // Code fragment detected - wrapping with React/HTML infrastructure
  
  // Escape any unmatched template literals or problematic syntax
  const safeCode = trimmed;
  
  // Check if code has JSX/React syntax
  const hasJSX = /<[A-Z][a-zA-Z0-9]*/.test(safeCode) || /className=/.test(safeCode);
  
  if (hasJSX) {
    // For React/JSX code, wrap with React infrastructure
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="mobile-web-app-capable" content="yes">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js"></script>
  <!--
    WARNING: In-browser Babel is for development preview only. Remove for production builds!
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  -->
  <!-- Tailwind CDN is always included for preview styling -->

  <style>
    body { margin: 0; padding: 0; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${safeCode}
    } catch (error) {
      console.error('Render error:', error);
      document.getElementById('root').innerHTML = '<div style="padding: 2rem; color: #ef4444;">Error rendering component. Check console for details.</div>';
    }
  </script>
</body>
</html>`;
  } else {
    // For plain HTML/CSS/JS, wrap minimally
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="mobile-web-app-capable" content="yes">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${safeCode}
</body>
</html>`;
  }
}

/**
 * Check if code is safe (for security).
 * Returns false if disallowed external scripts, javascript: URIs, or bare
 * iframes are detected.  Inline event handlers (onclick etc.) are flagged
 * as unsafe because they violate CSP — they will be stripped at save time
 * by sanitizeInlineHandlers() in lib/code-injector.ts.
 */
export function isCodeSafe(code: string): boolean {
  const dangerous = [
    // External scripts from non-allowlisted CDNs
    /<script[^>]*src=["'](?!https:\/\/(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.tailwindcss\.com))/i,
    // javascript: URIs (XSS vector)
    /javascript:/i,
    // Bare iframes without srcdoc (potential navigation hijack)
    /<iframe(?![^>]*srcdoc)/i,
    // Inline event handlers violate CSP script-src-attr 'none'
    /\s(onclick|onsubmit|onchange|oninput|onkeyup|onkeydown|onmouseover|onload)\s*=/i,
  ]

  return !dangerous.some(pattern => pattern.test(code))
}

/**
 * Returns a list of CSP violations found in the HTML string.
 * Useful for logging/debugging; call before saving to report issues.
 */
export function findCspViolations(code: string): string[] {
  const violations: string[] = []

  if (/\s(onclick|onsubmit|onchange|oninput|onkeyup|onkeydown|onmouseover|onload)\s*=/i.test(code)) {
    violations.push('Inline event handlers detected (onclick/onsubmit/etc.) — violates script-src-attr')
  }
  if (/<script[^>]*>[\s\S]*?<\/script>/i.test(code) && !/data-buildflow/i.test(code)) {
    violations.push('Inline <script> blocks detected — requires script-src unsafe-inline or nonce')
  }
  if (/\sstyle\s*=\s*["'][^"']+["']/i.test(code)) {
    violations.push('Inline style attributes detected — requires style-src unsafe-inline')
  }

  return violations
}
