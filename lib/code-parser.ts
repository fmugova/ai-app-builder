// lib/code-parser.ts

export interface ParsedCode {
  html: string | null;
  css: string | null;
  javascript: string | null;
  hasHtml: boolean;
  hasCss: boolean;
  hasJavaScript: boolean;
  isComplete: boolean;
  jsValid: boolean;
  jsError: string | null;
}

/**
 * Parses generated code blocks from markdown-formatted text
 */
export function parseGeneratedCode(content: string): ParsedCode {
  // Extract HTML
  const htmlMatch = content.match(/```html\n([\s\S]*?)\n```/);
  const html = htmlMatch ? htmlMatch[1].trim() : null;

  // Extract CSS
  const cssMatch = content.match(/```css\n([\s\S]*?)\n```/);
  const css = cssMatch ? cssMatch[1].trim() : null;

  // Extract JavaScript
  const jsMatch = content.match(/```(?:javascript|js)\n([\s\S]*?)\n```/);
  const javascript = jsMatch ? jsMatch[1].trim() : null;

  // Validate JavaScript syntax if present
  let jsValid = true;
  let jsError: string | null = null;

  if (javascript) {
    const validation = validateJavaScript(javascript);
    jsValid = validation.valid;
    jsError = validation.error;
  }

  // Check completeness
  const hasHtml = !!html && html.length > 0;
  const hasCss = !!css && css.length > 0;
  const hasJavaScript = !!javascript && javascript.length > 0;
  
  // Consider complete if has HTML and at least one of CSS/JS
  const isComplete = hasHtml && (hasCss || hasJavaScript);

  return {
    html,
    css,
    javascript,
    hasHtml,
    hasCss,
    hasJavaScript,
    isComplete,
    jsValid,
    jsError,
  };
}

/**
 * Validates JavaScript syntax
 */
export function validateJavaScript(code: string): { valid: boolean; error: string | null } {
  try {
    // Try to parse as a function to catch syntax errors
    new Function(code);
    return { valid: true, error: null };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown syntax error',
    };
  }
}

/**
 * Extracts just the code content without markdown formatting
 */
export function extractCodeBlock(content: string, language: string): string | null {
  const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Checks if code has CSP violations
 */
export function checkCSPViolations(html: string, javascript: string): string[] {
  const violations: string[] = [];

  // Check for inline styles
  if (html && html.match(/style\s*=\s*["'][^"']+["']/gi)) {
    violations.push('Inline styles detected (CSP violation)');
  }

  // Check for inline event handlers
  const inlineHandlers = ['onclick', 'onload', 'onchange', 'onsubmit', 'onmouseover', 'onmouseout'];
  inlineHandlers.forEach(handler => {
    const pattern = new RegExp(`${handler}\\s*=\\s*["'][^"']+["']`, 'gi');
    if (html && html.match(pattern)) {
      violations.push(`Inline ${handler} handler detected (CSP violation)`);
    }
  });

  // Check for inline scripts
  if (html && html.match(/<script[^>]*>[^<]+<\/script>/gi)) {
    violations.push('Inline script tags detected (CSP violation)');
  }

  // Check for dangerous JavaScript patterns
  if (javascript) {
    if (javascript.match(/\beval\s*\(/)) {
      violations.push('eval() usage detected (security risk)');
    }
    if (javascript.match(/new\s+Function\s*\(/)) {
      violations.push('Function constructor detected (security risk)');
    }
    if (javascript.match(/\.style\./)) {
      violations.push('Inline style manipulation detected (CSP violation)');
    }
  }

  return violations;
}

/**
 * Analyzes code quality and returns a score
 */
export function analyzeCodeQuality(parsed: ParsedCode): {
  score: number;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Check JavaScript validity
  if (parsed.hasJavaScript && !parsed.jsValid) {
    issues.push(`JavaScript syntax error: ${parsed.jsError}`);
    score -= 30;
  }

  // Check for completeness
  if (!parsed.hasHtml) {
    issues.push('Missing HTML content');
    score -= 40;
  }
  if (!parsed.hasCss) {
    warnings.push('Missing CSS content');
    score -= 10;
  }
  if (!parsed.hasJavaScript) {
    warnings.push('Missing JavaScript content');
    score -= 10;
  }

  // Check for CSP violations
  if (parsed.html && parsed.javascript) {
    const violations = checkCSPViolations(parsed.html, parsed.javascript);
    violations.forEach(violation => {
      issues.push(violation);
      score -= 10;
    });
  }

  // Check for accessibility basics
  if (parsed.html) {
    if (!parsed.html.includes('<h1')) {
      warnings.push('Missing h1 element (accessibility)');
      score -= 5;
    }
    if (!parsed.html.includes('alt=') && parsed.html.includes('<img')) {
      warnings.push('Images missing alt attributes (accessibility)');
      score -= 5;
    }
  }

  return {
    score: Math.max(0, score),
    issues,
    warnings,
  };
}