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
  // CRITICAL: Clean markdown artifacts AND code fences first
  content = cleanMarkdownArtifacts(content);
  
  // Also strip code fences that AI often adds
  const originalLength = content.length;
  content = content
    .replace(/^```html\s*\n?/gm, '')
    .replace(/^```javascript\s*\n?/gm, '')
    .replace(/^```js\s*\n?/gm, '')
    .replace(/^```css\s*\n?/gm, '')
    .replace(/^```typescript\s*\n?/gm, '')
    .replace(/^```ts\s*\n?/gm, '')
    .replace(/^```\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
  
  if (originalLength !== content.length) {
    console.log('🧹 Stripped markdown fences:', originalLength - content.length, 'chars removed');
  }

  // Try strict parsing first, then fall back to flexible parsing
  let html = extractCodeBlock(content, 'html');
  if (!html) html = findLastCompleteBlock(content, 'html');
  
  let css = extractCodeBlock(content, 'css');
  if (!css) css = findLastCompleteBlock(content, 'css');
  
  let javascript = extractCodeBlock(content, 'javascript') || extractCodeBlock(content, 'js');
  if (!javascript) javascript = findLastCompleteBlock(content, 'javascript') || findLastCompleteBlock(content, 'js');

  // FALLBACK: If no code blocks found, check if content is already complete HTML
  if (!html && !css && !javascript) {
    // Check if the content looks like complete HTML
    const hasDoctype = /<!DOCTYPE html>/i.test(content);
    const hasHtmlTag = /<html[^>]*>/i.test(content);
    const hasBodyTag = /<body[^>]*>/i.test(content);
    
    if (hasDoctype || (hasHtmlTag && hasBodyTag)) {
      // This is already complete HTML without markdown wrappers
      html = content;
      
      // Extract CSS from <style> tags
      const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      if (styleMatch && styleMatch[1]) {
        css = styleMatch[1].trim();
      }
      
      // Extract JavaScript from <script> tags
      const scriptMatches = content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      const scripts: string[] = [];
      for (const match of scriptMatches) {
        if (match[1] && match[1].trim()) {
          const scriptContent = match[1].trim();
          
          // Skip malformed script blocks containing HTML tags (but allow < > in legitimate JS like comparisons, template literals)
          // Check for actual HTML tags like <div>, <p>, etc. but allow mathematical comparisons and template strings
          const hasHTMLTags = /<[a-zA-Z][a-zA-Z0-9]*[^>]*>/g.test(scriptContent.replace(/`[\s\S]*?`/g, '')); // Remove template literals first
          if (hasHTMLTags) {
            console.warn('⚠️ Skipping malformed script block containing HTML tags');
            continue;
          }
          
          scripts.push(scriptContent);
        }
      }
      if (scripts.length > 0) {
        javascript = scripts.join('\n\n');
      }
    }
  }

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
  
  // Remove AI's explanatory text at the beginning (including validation checklists)
  // This catches patterns like: "I'll create... Here's the full implementation: ✅ **VALIDATION CHECKLIST..."
  content = content.replace(/^(?:I'll|I will|Here's|Here is|This is|Let me|This will|I've|I have created?|I created?)[\s\S]*?(?:full implementation|complete|files?)?[\s\S]*?(?:✅\s*\*\*VALIDATION CHECKLIST[\s\S]*?)?(?=<!DOCTYPE|<html|<!--\s*File:)/is, '');
  
  // Remove standalone validation sections at the beginning (before HTML or file markers)
  content = content.replace(/^[\s\S]*?✅\s*\*\*VALIDATION CHECKLIST[^:]*:?\*\*[\s\S]*?(?=<!DOCTYPE|<html|<!--\s*File:)/i, '');
  
  // Remove validation checklist sections anywhere in the content (not just at end)
  content = content.replace(/\n*##\s*Validation\s*Checklist[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:|$))/gi, '');
  content = content.replace(/\n*\*\*VALIDATION CHECKLIST[^:]*:?\*\*[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:|$))/gi, '');
  content = content.replace(/\n*VALIDATION CHECKLIST[^:]*:?[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:|$))/gi, '');
  content = content.replace(/\n*✅[\s\S]*?(?:VERIFICATION|VALIDATION|CHECKLIST)[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:|$))/gi, '');
  content = content.replace(/\n*##\s*Features[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:|$))/gi, '');
  content = content.replace(/\n*(?:This|The)\s+(?:landing page|portfolio|app|application|website)\s+includes:[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:|$))/gi, '');
  
  // Remove "Here are the complete HTML files:" type headings
  content = content.replace(/\n*##\s*(?:index\.html|about\.html|contact\.html|services\.html|[\w-]+\.html)[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:))/gi, '');
  content = content.replace(/Here (?:are|is) the complete (?:HTML )?files?:?[\s\S]*?(?=\n*(?:<!DOCTYPE|<html|<!--\s*File:))/gi, '');
  
  // Remove validation text between file markers in multi-page generation
  content = content.replace(/(<!--\s*File:[^>]*-->[^<]*<\/html>)\s*\n+(?:✅|##)[\s\S]*?(?:VALIDATION|Features|includes:)[\s\S]*?(?=<!--\s*File:|$)/gi, '$1\n\n');
  content = content.replace(/\n*##\s*Features[\s\S]*?(?=\n*$|$)/gi, '');
  content = content.replace(/\n*(?:This|The)\s+(?:landing page|portfolio|app|application|website)\s+includes:[\s\S]*?(?=\n*$|$)/gi, '');
  
  // Remove any markdown lists or explanations after </html>
  content = content.replace(/(<\/html>)\s*\n+[-*]\s+.*?[\s\S]*$/i, '$1');
  content = content.replace(/(<\/html>)\s*\n+##\s+.*?[\s\S]*$/i, '$1');
  
  // Remove any trailing explanatory text after </html>
  content = content.replace(/(<\/html>)[\s\S]*$/i, '$1');
  
  // Clean up any extra backticks outside of code blocks
  // But preserve the code fence markers themselves
  return content.trim();
}

/**
 * Auto-completes incomplete HTML by adding missing closing tags
 */
export function completeIncompleteHTML(html: string): string {
  if (!html) return html;
  
  // Track which tags need closing
  const missingClosingTags: string[] = [];
  
  // Check for missing </script> tags
  const openScripts = (html.match(/<script[^>]*>/gi) || []).length;
  const closeScripts = (html.match(/<\/script>/gi) || []).length;
  if (openScripts > closeScripts) {
    for (let i = 0; i < openScripts - closeScripts; i++) {
      missingClosingTags.push('</script>');
    }
  }
  
  // Check for missing </style> tags
  const openStyles = (html.match(/<style[^>]*>/gi) || []).length;
  const closeStyles = (html.match(/<\/style>/gi) || []).length;
  if (openStyles > closeStyles) {
    for (let i = 0; i < openStyles - closeStyles; i++) {
      missingClosingTags.push('</style>');
    }
  }
  
  // Check for missing </div> tags
  const openDivs = (html.match(/<div[^>]*>/gi) || []).length;
  const closeDivs = (html.match(/<\/div>/gi) || []).length;
  if (openDivs > closeDivs) {
    for (let i = 0; i < openDivs - closeDivs; i++) {
      missingClosingTags.push('</div>');
    }
  }
  
  // Check for missing </body> tag
  if (/<body[^>]*>/i.test(html) && !/<\/body>/i.test(html)) {
    missingClosingTags.push('</body>');
  }
  
  // Check for missing </html> tag
  if (/<html[^>]*>/i.test(html) && !/<\/html>/i.test(html)) {
    missingClosingTags.push('</html>');
  }
  
  // Append all missing closing tags
  if (missingClosingTags.length > 0) {
    html = html.trimEnd() + '\n' + missingClosingTags.join('\n');
  }
  
  return html;
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
