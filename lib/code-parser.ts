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
 * Updated with robust streaming-aware parsing
 */
export function parseGeneratedCode(content: string): ParsedCode {
  content = cleanMarkdownArtifacts(content);

  // Try strict parsing first, then fall back to flexible parsing
  let html = extractCodeBlock(content, 'html');
  if (!html) html = findLastCompleteBlock(content, 'html');
  
  let css = extractCodeBlock(content, 'css');
  if (!css) css = findLastCompleteBlock(content, 'css');
  
  let javascript = extractCodeBlock(content, 'javascript') || extractCodeBlock(content, 'js');
  if (!javascript) javascript = findLastCompleteBlock(content, 'javascript') || findLastCompleteBlock(content, 'js');

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
  // OR if the total content is substantial (likely a complete generation)
  const isComplete = (hasHtml && (hasCss || hasJavaScript)) || 
                     (hasHtml && html !== null && html.length > 500) || 
                     (content.length > 5000 && (hasHtml || hasCss || hasJavaScript));

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
 * More flexible version that handles various newline patterns
 */
export function extractCodeBlock(content: string, language: string): string | null {
  // Try multiple regex patterns for flexibility
  const patterns = [
    // Standard: ```html\n...\n```
    new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'i'),
    // Flexible: ```html ... ``` (any whitespace)
    new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\`\`\``, 'i'),
    // No newline before closing: ```html...```
    new RegExp(`\`\`\`${language}([\\s\\S]*?)\`\`\``, 'i'),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Find the last complete code block of a given language
 * Useful for streaming scenarios where content may be building up
 */
function findLastCompleteBlock(content: string, language: string): string | null {
  const pattern = new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\`\`\``, 'gi');
  let lastMatch: string | null = null;
  let match;
  
  while ((match = pattern.exec(content)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      lastMatch = match[1].trim();
    }
  }
  
  return lastMatch;
}

/**
 * Check if the stream appears incomplete
 * (has opening code blocks without matching closing blocks)
 */
export function isStreamingIncomplete(content: string): boolean {
  const openBlocks = (content.match(/```(?:html|css|javascript|js)/g) || []).length;
  const closeBlocks = (content.match(/```(?!\w)/g) || []).length;
  return openBlocks > closeBlocks;
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

/**
 * Cleans markdown artifacts and extra formatting
 */
export function cleanMarkdownArtifacts(content: string): string {
  // Remove markdown headers (## HTML, ## CSS, etc.)
  content = content.replace(/##\s*(HTML|CSS|JavaScript|JS)\s*\n/gi, '');
  
  // Remove standalone section markers
  content = content.replace(/\*\*HTML\*\*/gi, '');
  content = content.replace(/\*\*CSS\*\*/gi, '');
  content = content.replace(/\*\*JavaScript\*\*/gi, '');
  
  // Clean up any extra backticks outside of code blocks
  // But preserve the code fence markers themselves
  return content.trim();
}

/**
 * Extracts code from streaming content even if incomplete
 * Returns partial results that can be updated as more content arrives
 */
export function parseStreamingCode(content: string): ParsedCode {
  const cleaned = cleanMarkdownArtifacts(content);
  
  // Look for any code blocks, complete or incomplete
  const htmlPattern = /```html\s*([\s\S]*?)(?:```|$)/i;
  const cssPattern = /```css\s*([\s\S]*?)(?:```|$)/i;
  const jsPattern = /```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i;
  
  const htmlMatch = cleaned.match(htmlPattern);
  const cssMatch = cleaned.match(cssPattern);
  const jsMatch = cleaned.match(jsPattern);
  
  const html = htmlMatch ? htmlMatch[1].trim() : null;
  const css = cssMatch ? cssMatch[1].trim() : null;
  const javascript = jsMatch ? jsMatch[1].trim() : null;
  
  // For streaming, don't validate JavaScript syntax as it might be incomplete
  const hasHtml = !!html && html.length > 0;
  const hasCss = !!css && css.length > 0;
  const hasJavaScript = !!javascript && javascript.length > 0;
  
  // Streaming content is considered incomplete by default
  const isComplete = !isStreamingIncomplete(cleaned) && (hasHtml || hasCss || hasJavaScript);
  
  return {
    html,
    css,
    javascript,
    hasHtml,
    hasCss,
    hasJavaScript,
    isComplete,
    jsValid: true, // Skip validation during streaming
    jsError: null,
  };
}