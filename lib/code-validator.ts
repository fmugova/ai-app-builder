/**
 * Enhanced Code Validator for BuildFlow AI
 * Prevents incomplete or invalid code from being saved
 */

import * as acorn from 'acorn';

export interface ValidationResult {
  validationPassed: boolean;
  validationScore: number;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  passed: boolean;
}

export interface ValidationMessage {
  message: string;
  line?: number;
  column?: number;
  type?: 'syntax' | 'structure' | 'completeness';
}

export interface GeneratedCode {
  html: string;
  css: string;
  js: string;
}

/**
 * Validates JavaScript code for syntax errors and completeness
 */
export function validateJavaScript(jsCode: string): ValidationMessage[] {
  const errors: ValidationMessage[] = [];

  if (!jsCode || jsCode.trim() === '') {
    return errors; // Empty JS is valid
  }

  try {
    // Parse JavaScript with acorn (same parser used by many tools)
    acorn.parse(jsCode, {
      ecmaVersion: 2022,
      sourceType: 'script',
      locations: true,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message: string; loc?: { line?: number; column?: number } };
      errors.push({
        message: `JavaScript Syntax Error: ${err.message}`,
        line: err.loc?.line,
        column: err.loc?.column,
        type: 'syntax',
      });
    } else {
      errors.push({
        message: 'JavaScript Syntax Error: Unknown error',
        type: 'syntax',
      });
    }
  }

  // Check for incomplete code patterns
  const incompletePatterns = [
    { regex: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*$/s, message: 'Incomplete function definition (missing closing brace)' },
    { regex: /class\s+\w+\s*\{[^}]*$/s, message: 'Incomplete class definition' },
    { regex: /\bif\s*\([^)]*\)\s*\{[^}]*$/s, message: 'Incomplete if statement' },
    { regex: /\bfor\s*\([^)]*\)\s*\{[^}]*$/s, message: 'Incomplete for loop' },
    { regex: /\bwhile\s*\([^)]*\)\s*\{[^}]*$/s, message: 'Incomplete while loop' },
    { regex: /=>\s*\{[^}]*$/s, message: 'Incomplete arrow function' },
    { regex: /^\s*\*\/$/, message: 'Ends with incomplete comment' },
  ];

  for (const pattern of incompletePatterns) {
    if (pattern.regex.test(jsCode)) {
      errors.push({
        message: pattern.message,
        type: 'completeness',
      });
    }
  }

  // Check for unmatched brackets/braces
  const braceBalance = checkBraceBalance(jsCode);
  if (braceBalance.errors.length > 0) {
    errors.push(...braceBalance.errors);
  }

  return errors;
}

/**
 * Validates HTML structure
 */
export function validateHTML(htmlCode: string): ValidationMessage[] {
  const errors: ValidationMessage[] = [];

  if (!htmlCode || htmlCode.trim() === '') {
    errors.push({
      message: 'HTML is empty or missing',
      type: 'completeness',
    });
    return errors;
  }

  // Check for basic HTML structure
  const hasContent = /<[^>]+>/.test(htmlCode);
  if (!hasContent) {
    errors.push({
      message: 'No valid HTML tags found',
      type: 'structure',
    });
  }

  // Check for incomplete tags
  const openTags = htmlCode.match(/<[^/>][^>]*[^/]>/g) || [];
  const closeTags = htmlCode.match(/<\/[^>]+>/g) || [];
  
  // Simple heuristic: should have some closing tags if there are opening tags
  if (openTags.length > 3 && closeTags.length === 0) {
    errors.push({
      message: 'HTML appears incomplete - missing closing tags',
      type: 'structure',
    });
  }

  // Check for truncated HTML (ends mid-tag or with unclosed elements)
  if (/<[^>]*$/.test(htmlCode.trim()) || /<\w+[^>]*>(?![\s\S]*?<\/\w+>)/.test(htmlCode.trim())) {
    errors.push({
      message: 'HTML appears truncated (ends mid-tag or has unclosed elements)',
      type: 'completeness',
    });
  }

  return errors;
}

/**
 * Validates CSS syntax
 */
export function validateCSS(cssCode: string): ValidationMessage[] {
  const errors: ValidationMessage[] = [];

  if (!cssCode || cssCode.trim() === '') {
    return errors; // Empty CSS is valid
  }

  // Check for incomplete CSS rules
  const rules = cssCode.split('}');
  for (let i = 0; i < rules.length - 1; i++) {
    const rule = rules[i].trim();
    if (rule && !rule.includes('{')) {
      errors.push({
        message: 'CSS appears incomplete (unmatched braces)',
        type: 'syntax',
      });
      break;
    }
  }

  // Check if ends mid-rule
  if (cssCode.trim().endsWith('{') || /:\s*[^;}]*$/.test(cssCode.trim())) {
    errors.push({
      message: 'CSS appears truncated (incomplete rule)',
      type: 'completeness',
    });
  }

  // Check brace balance
  const openBraces = (cssCode.match(/\{/g) || []).length;
  const closeBraces = (cssCode.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push({
      message: `CSS has unmatched braces (${openBraces} open, ${closeBraces} close)`,
      type: 'syntax',
    });
  }

  return errors;
}

/**
 * Check brace/bracket balance in code
 */
function checkBraceBalance(code: string): { errors: ValidationMessage[] } {
  const errors: ValidationMessage[] = [];
  const stack: { char: string; pos: number }[] = [];
  const pairs: { [key: string]: string } = {
    '{': '}',
    '[': ']',
    '(': ')',
  };

  let inString = false;
  let inComment = false;
  let stringChar = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];

    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = true;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inComment = true;
        continue;
      }
      if (inComment && char === '*' && nextChar === '/') {
        inComment = false;
        i++; // skip next char
        continue;
      }
      if (inComment && char === '\n') {
        inComment = false;
        continue;
      }
    }

    if (inComment) continue;

    // Handle strings
    if (char === '"' || char === "'" || char === '`') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && code[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    // Check brackets
    if (pairs[char]) {
      stack.push({ char, pos: i });
    } else if (Object.values(pairs).includes(char)) {
      const last = stack.pop();
      if (!last || pairs[last.char] !== char) {
        errors.push({
          message: `Unmatched closing bracket '${char}'`,
          type: 'syntax',
        });
      }
    }
  }

  // Check for unmatched opening brackets
  if (stack.length > 0) {
    errors.push({
      message: `${stack.length} unmatched opening bracket(s) found`,
      type: 'syntax',
    });
  }

  return { errors };
}

/**
 * Main validation function - validates all code at once
 */
export function validateGeneratedCode(code: GeneratedCode): ValidationResult {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];

  // Validate HTML
  const htmlErrors = validateHTML(code.html);
  errors.push(...htmlErrors);

  // Validate CSS
  const cssErrors = validateCSS(code.css);
  errors.push(...cssErrors);

  // Validate JavaScript (most critical)
  const jsErrors = validateJavaScript(code.js);
  errors.push(...jsErrors);

  // Calculate validation score
  const maxErrors = 10;
  const errorCount = errors.length;
  const validationScore = Math.max(0, Math.round((1 - errorCount / maxErrors) * 100));

  // Validation passes if no critical errors
  const validationPassed = errors.length === 0;

  return {
    validationPassed,
    validationScore,
    errors,
    warnings,
    passed: validationPassed,
  };
}

/**
 * Quick check if code appears complete (for streaming)
 */
export function isCodeComplete(code: string, type: 'html' | 'css' | 'js'): boolean {
  if (!code || code.trim() === '') return false;

  switch (type) {
    case 'html':
      // Should have closing tags and not end mid-tag
      return !/<[^>]*$/.test(code) && /<\/[^>]+>/.test(code);
    
    case 'css':
      // Should have balanced braces
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      return openBraces === closeBraces && !code.trim().endsWith('{');
    
    case 'js':
      // Try parsing - if it fails, it's incomplete
      try {
        acorn.parse(code, { ecmaVersion: 2022 });
        return true;
      } catch {
        return false;
      }
  }
}
