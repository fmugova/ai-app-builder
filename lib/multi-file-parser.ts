/**
 * Multi-File Project Parser
 * Extracts Next.js project structure from AI-generated JSON
 */

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

export interface EnvVar {
  key: string;
  description: string;
  example?: string;
  required: boolean;
}

export interface MultiFileProject {
  projectName: string;
  description: string;
  projectType: 'website' | 'fullstack';
  files: ProjectFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  envVars: EnvVar[];
  setupInstructions: string[];
}

export interface ParseResult {
  success: boolean;
  project?: MultiFileProject;
  error?: string;
}

/**
 * Find the position after the last complete JSON key-value entry.
 * Looks for the last `},` or `}]` or `"]` pattern that ends a complete file entry.
 * Returns 0 if no safe truncation point found.
 */
function findLastCompleteJsonEntry(json: string): number {
  // Properly track string context to find the last complete file object.
  // We need to distinguish structural `}` from `}` inside string values.
  //
  // Strategy: scan the JSON tracking whether we're inside a string.
  // Record positions of structural `}` that are followed by `,` or whitespace.
  // The last such position marks the end of the last complete file object.

  let inString = false;
  let depth = 0;
  let lastCompleteObjectEnd = 0;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (inString) {
      if (ch === '\\') {
        i++; // skip escaped character
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    // Not inside a string
    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;

      // A `}` at depth 2 is the end of a file object in the files array:
      // depth 0 = root object, depth 1 = files array, depth 2 = file object
      // After closing, depth becomes 1, so check for depth === 1 after decrement
      if (ch === '}' && depth === 1) {
        // Look ahead past whitespace for `,` (more objects follow) or `]` (array end)
        let j = i + 1;
        while (j < json.length && /\s/.test(json[j])) j++;
        if (j < json.length && (json[j] === ',' || json[j] === ']')) {
          // Include the comma if present
          lastCompleteObjectEnd = json[j] === ',' ? j + 1 : i + 1;
        }
      }
    }
  }

  return lastCompleteObjectEnd;
}

/**
 * Repair common JSON formatting errors from AI generation
 */
function repairCommonJsonErrors(jsonString: string): string {
  let repaired = jsonString;
  
  // Fix 1: Double colon in dependencies (e.g., "pkg1": "pkg2": "version")
  // Pattern: "key": "value": "version" should be split into two entries
  // Match: "anykey": "@scope/pkg": "^version",
  repaired = repaired.replace(
    /"([^"]+)":\s*"(@[^"]+)":\s*"([^"]+)"/g,
    (match, key, scopedPkg, version) => {
      console.log(`🔧 Fixing double colon: ${key} / ${scopedPkg}`);
      // Keep the scoped package with its version, remove the first key
      return `"${scopedPkg}": "${version}"`;
    }
  );
  
  // Fix 2: Missing commas between object properties (common AI error)
  // Pattern: }"key": should be },"key":
  repaired = repaired.replace(/}(\s*)"([^"]+)":/g, '},$1"$2":');
  
  // Fix 3: Missing commas between array elements
  // Pattern: ][ should be ],[
  repaired = repaired.replace(/\]\s*\[/g, '],[');
  
  // Fix 4: Trailing commas before closing brackets (valid in JS, invalid in JSON)
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  return repaired;
}

/**
 * Parse AI response to extract multi-file project
 */
export function parseMultiFileProject(aiResponse: string): ParseResult {
  try {
    let jsonString = aiResponse.trim();

    console.log('🔍 Raw response preview (first 200 chars):', jsonString.substring(0, 200));
    console.log('📏 Total response length:', jsonString.length);

    // Remove markdown code fences if present
    // Handle various formats: ```json\n...\n```, ```\n...\n```, or just ```...```
    if (jsonString.startsWith('```')) {
      console.log('📝 Detected code fence, removing...');
      // Remove opening fence (```json or ```)
      jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '');
      // Remove closing fence
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      console.log('✅ After fence removal (first 200 chars):', jsonString.substring(0, 200));
      console.log('📏 Cleaned length:', jsonString.length);
    }

    // Try to fix common JSON issues before parsing
    // 1. Remove any trailing commas before closing braces/brackets
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // 2. Fix improperly escaped backslashes - improved logic
    let fixedString = '';
    let inString = false;
    let i = 0;
    
    while (i < jsonString.length) {
      const char = jsonString[i];
      
      // Toggle string state on unescaped quotes
      if (char === '"') {
        // Count preceding backslashes to determine if quote is escaped
        let backslashCount = 0;
        let j = i - 1;
        while (j >= 0 && jsonString[j] === '\\') {
          backslashCount++;
          j--;
        }
        // Quote is only escaped if odd number of backslashes precede it
        if (backslashCount % 2 === 0) {
          inString = !inString;
        }
        fixedString += char;
        i++;
      }
      // Handle backslashes inside strings
      else if (char === '\\' && inString) {
        const nextChar = jsonString[i + 1];
        
        // Check if this is a valid escape sequence
        const validEscapes = ['\\', '"', '/', 'b', 'f', 'n', 'r', 't', 'u'];
        
        if (nextChar && validEscapes.includes(nextChar)) {
          // Valid escape sequence (\\, \", \n, \t, etc.) — keep BOTH chars and skip past them
          // Critical: we must skip the escape char too, otherwise \\ would cause the
          // second \ to be re-examined and incorrectly modified
          fixedString += char + nextChar;
          i += 2;
        } else if (nextChar === "'") {
          // \' is invalid JSON — single quotes don't need escaping, just drop the backslash
          // The next iteration will add the ' character normally
          i++;
        } else {
          // Other invalid escape — double the backslash to preserve the literal \
          console.log(`⚠️ Fixing invalid escape at position ${i}, next char: "${nextChar}"`);
          fixedString += '\\\\';
          i++;
        }
      }
      // All other characters
      else {
        fixedString += char;
        i++;
      }
    }
    
    jsonString = fixedString;
    
    // 3. Ensure the JSON is complete (check for balanced braces)
    const openBraces = (jsonString.match(/{/g) || []).length;
    const closeBraces = (jsonString.match(/}/g) || []).length;
    const openBrackets = (jsonString.match(/\[/g) || []).length;
    const closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    console.log('🔍 JSON structure check:', {
      openBraces,
      closeBraces,
      openBrackets,
      closeBrackets,
      balanced: openBraces === closeBraces && openBrackets === closeBrackets
    });

    // If JSON seems truncated, try to repair it
    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      console.warn('⚠️ JSON appears truncated, attempting to repair...');

      // Find the last complete file object in the files array (string-context-aware)
      const lastCompleteEntry = findLastCompleteJsonEntry(jsonString);
      if (lastCompleteEntry > 0) {
        jsonString = jsonString.substring(0, lastCompleteEntry);
        console.log(`🔧 Truncated to last complete entry at position ${lastCompleteEntry}`);

        // Now properly close the JSON structure: close files array + root object
        // The truncated string should end right after a complete file object + comma
        // We need: ] to close files array, then } to close root object
        // But there may be other top-level fields after files (dependencies, etc.)
        // that are now lost — that's OK, they're optional.
        const trimmed = jsonString.trimEnd();
        // Remove trailing comma if present
        const cleaned = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
        jsonString = cleaned + ']}';
        console.log(`🔧 Closed files array and root object`);
      } else {
        // Fallback: try to close an unterminated string
        let quoteCount = 0;
        for (let qi = 0; qi < jsonString.length; qi++) {
          if (jsonString[qi] === '"') {
            let bs = 0;
            let bj = qi - 1;
            while (bj >= 0 && jsonString[bj] === '\\') { bs++; bj--; }
            if (bs % 2 === 0) quoteCount++;
          }
        }
        if (quoteCount % 2 !== 0) {
          jsonString += '"';
          console.log('🔧 Closed unterminated string');
        }

        // Recount and add missing closing brackets/braces
        const ob = (jsonString.match(/{/g) || []).length;
        const cb = (jsonString.match(/}/g) || []).length;
        const oB = (jsonString.match(/\[/g) || []).length;
        const cB = (jsonString.match(/\]/g) || []).length;

        for (let i = 0; i < (oB - cB); i++) jsonString += ']';
        for (let i = 0; i < (ob - cb); i++) jsonString += '}';
        console.log('🔧 Added missing closing characters');
      }
    }

    // Repair common JSON malformations before parsing
    jsonString = repairCommonJsonErrors(jsonString);

    // Parse JSON with better error context
    let parsed;
    try {
      parsed = JSON.parse(jsonString.trim());
    } catch (parseError) {
      // Enhanced error context for debugging
      const error = parseError as SyntaxError;
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const start = Math.max(0, pos - 100);
        const end = Math.min(jsonString.length, pos + 100);
        const context = jsonString.substring(start, end);
        console.error('❌ JSON parse error at position', pos);
        console.error('Context:', context);
      }
      throw parseError;
    }

    // Validate required fields
    if (!parsed.projectName || !parsed.files || !Array.isArray(parsed.files)) {
      return {
        success: false,
        error: 'Invalid project structure: missing projectName or files array',
      };
    }

    // Filter out any incomplete files (may happen from JSON truncation repair)
    const originalCount = parsed.files.length;
    parsed.files = parsed.files.filter((f: { path?: string; content?: string }) => f.path && typeof f.content === 'string');
    if (parsed.files.length === 0) {
      return {
        success: false,
        error: 'Invalid files: no files have both path and content',
      };
    }
    if (parsed.files.length < originalCount) {
      console.log(`⚠️ Filtered out ${originalCount - parsed.files.length} incomplete files (truncation artifact)`);
    }

    // Infer language from file extension
    const filesWithLanguage = parsed.files.map((file: ProjectFile) => ({
      ...file,
      language: inferLanguage(file.path),
    }));

    const project: MultiFileProject = {
      projectName: parsed.projectName,
      description: parsed.description || '',
      projectType: parsed.projectType || 'website',
      files: filesWithLanguage,
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
      envVars: parsed.envVars || [],
      setupInstructions: parsed.setupInstructions || [],
    };

    return {
      success: true,
      project,
    };
  } catch (error) {
    console.error('Failed to parse multi-file project:', error);
    
    // Provide detailed error information
    if (error instanceof SyntaxError) {
      const errorMessage = error.message;
      const match = errorMessage.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const snippet = aiResponse.substring(Math.max(0, position - 100), Math.min(aiResponse.length, position + 100));
        console.error('❌ JSON error context:', snippet);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Infer programming language from file extension
 */
function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    html: 'html',
    prisma: 'prisma',
    env: 'bash',
  };

  return languageMap[ext || ''] || 'text';
}

/**
 * Generate a ZIP-friendly file structure
 */
export function generateFileTree(project: MultiFileProject): string {
  const tree = project.files.map(f => f.path).sort();
  return tree.join('\n');
}

/**
 * Get main entry file (usually app/page.tsx or index.html)
 */
export function getEntryFile(project: MultiFileProject): ProjectFile | null {
  const priorities = [
    'app/page.tsx',
    'pages/index.tsx',
    'index.html',
    'src/index.tsx',
  ];

  for (const priority of priorities) {
    const file = project.files.find(f => f.path === priority);
    if (file) return file;
  }

  return project.files[0] || null;
}

/**
 * Extract JSX body from a TSX/JSX page component and return HTML-safe content.
 * Uses parenthesis depth tracking to find the correct return statement
 * from the default export (not inner helper functions).
 */
function extractJSXBody(tsxContent: string): string {
  // Strategy: find the return statement that belongs to the default export function.
  // Support both `return (jsx)` and `return <jsx>` patterns.

  // Find the default export function position
  const exportDefaultMatch = tsxContent.match(/export\s+default\s+function\s+\w*/);
  const exportPos = exportDefaultMatch?.index ?? 0;

  // Try approach 1: `return (` with parenthesis depth tracking
  const returnParenRegex = /\breturn\s*\(/g;
  const returnParenPositions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = returnParenRegex.exec(tsxContent)) !== null) {
    returnParenPositions.push(m.index);
  }

  // Prefer the return after export default
  let jsx = '';

  if (returnParenPositions.length > 0) {
    let targetReturnPos = returnParenPositions[returnParenPositions.length - 1];
    if (exportDefaultMatch && exportDefaultMatch.index !== undefined) {
      const afterExport = returnParenPositions.find(p => p > exportPos);
      if (afterExport !== undefined) targetReturnPos = afterExport;
    }

    const afterReturn = tsxContent.indexOf('(', targetReturnPos);
    if (afterReturn !== -1) {
      jsx = extractBalancedParens(tsxContent, afterReturn);
    }
  }

  // Try approach 2: `return <tag` without parentheses (find matching close tag via angle bracket depth)
  if (!jsx) {
    const returnTagRegex = /\breturn\s*(<)/g;
    const returnTagPositions: number[] = [];
    while ((m = returnTagRegex.exec(tsxContent)) !== null) {
      returnTagPositions.push(m.index);
    }

    if (returnTagPositions.length > 0) {
      let targetPos = returnTagPositions[returnTagPositions.length - 1];
      if (exportDefaultMatch && exportDefaultMatch.index !== undefined) {
        const afterExport = returnTagPositions.find(p => p > exportPos);
        if (afterExport !== undefined) targetPos = afterExport;
      }

      // Find the `<` after return
      const tagStart = tsxContent.indexOf('<', targetPos);
      if (tagStart !== -1) {
        jsx = extractBalancedJSX(tsxContent, tagStart);
      }
    }
  }

  if (!jsx) return '';

  // Sanity check: JSX should start with < (an HTML/JSX tag)
  if (!jsx.startsWith('<')) return '';

  // Reject if it contains raw JSON structure (corrupted content)
  if (/"\s*:\s*"/.test(jsx) || /\{\s*"path"\s*:/.test(jsx)) return '';

  // Convert common JSX-isms to plain HTML
  jsx = jsxToHtml(jsx);

  return jsx;
}

/** Extract content inside balanced parentheses starting at `(` position. */
function extractBalancedParens(src: string, openPos: number): string {
  let depth = 0;
  let start = -1;
  let end = -1;

  for (let i = openPos; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(src, i);
      continue;
    }
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (start === -1 || end === -1 || end <= start) return '';
  return src.substring(start, end).trim();
}

/** Extract JSX starting at `<` by tracking tag depth (handles fragments `<>...</>`). */
function extractBalancedJSX(src: string, startPos: number): string {
  let depth = 0;
  let i = startPos;
  const len = src.length;

  while (i < len) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(src, i) + 1;
      continue;
    }
    if (ch === '{') {
      // Skip JSX expressions
      let braceDepth = 1;
      i++;
      while (i < len && braceDepth > 0) {
        if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
          i = skipString(src, i) + 1;
          continue;
        }
        if (src[i] === '{') braceDepth++;
        else if (src[i] === '}') braceDepth--;
        i++;
      }
      continue;
    }
    if (ch === '<') {
      // Check for closing tag </...> or fragment closer </>
      if (src[i + 1] === '/') {
        depth--;
        // Find the `>`
        const closeEnd = src.indexOf('>', i);
        if (closeEnd === -1) break;
        i = closeEnd + 1;
        if (depth <= 0) return src.substring(startPos, i).trim();
        continue;
      }
      // Self-closing tag or opening tag
      depth++;
      // Check if self-closing: find next `>` and check if preceded by `/`
      let j = i + 1;
      while (j < len && src[j] !== '>') {
        if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
          j = skipString(src, j) + 1;
          continue;
        }
        if (src[j] === '{') {
          let bd = 1;
          j++;
          while (j < len && bd > 0) {
            if (src[j] === '{') bd++;
            else if (src[j] === '}') bd--;
            j++;
          }
          continue;
        }
        j++;
      }
      if (j < len && src[j] === '>' && j > 0 && src[j - 1] === '/') {
        depth--; // Self-closing
      }
      i = j + 1;
      if (depth <= 0) return src.substring(startPos, i).trim();
      continue;
    }
    i++;
  }

  // If we got some content, return what we found even if depth didn't close perfectly
  if (i > startPos + 20) return src.substring(startPos, i).trim();
  return '';
}

/** Skip a string literal and return index of closing quote. */
function skipString(src: string, quotePos: number): number {
  const quote = src[quotePos];
  let i = quotePos + 1;
  while (i < src.length) {
    if (src[i] === '\\') { i++; }
    else if (src[i] === quote) return i;
    i++;
  }
  return i;
}

/**
 * Convert JSX string to plain HTML for preview.
 */
function jsxToHtml(jsx: string): string {
  // Step 1: Remove all JSX expressions {...} with proper nesting support
  // This handles nested braces like {items.filter(i => i.active).map(i => (...))}
  let result = removeJsxExpressions(jsx);

  result = result
    // React fragments <> ... </> → just the content
    .replace(/<>\s*/g, '')
    .replace(/<\/>\s*/g, '')
    // className → class
    .replace(/\bclassName=/g, 'class=')
    // htmlFor → for
    .replace(/\bhtmlFor=/g, 'for=')
    // Self-closing tags that HTML doesn't support
    .replace(/<(div|span|p|section|main|header|footer|nav|ul|ol|li|h[1-6]|form|table|tbody|thead|tr|td|th|article|aside)\s*\/>/g, '<$1></$1>')
    // Remove onClick, onChange, onSubmit, etc. event handlers
    .replace(/\s+on[A-Z]\w+=[{"][^}"]*[}"]/g, '')
    // Remove React-specific attributes (ref, key, dangerouslySetInnerHTML)
    .replace(/\s+(ref|key|dangerouslySetInnerHTML)=[{"][^}"]*[}"]/g, '')
    // Convert Next.js components to HTML equivalents
    .replace(/<Link\s+(?:href=)/g, '<a href=')
    .replace(/<\/Link>/g, '</a>')
    .replace(/<Image\s+/g, '<img ')
    .replace(/<\/Image>/g, '')
    // Clean up any leftover empty attributes or braces
    .replace(/\s+=/g, '')
    // Clean up any remaining stray braces/parens from expressions
    .replace(/[{}()]\s*[{}()]/g, '')
    .replace(/^\s*[})]\s*$/gm, '');

  return result;
}

/**
 * Remove JSX expressions {...} from JSX string, properly handling nesting.
 * Preserves simple string literals like {"text"} and {`template`} as plain text.
 * Replaces everything else with empty string or placeholder.
 */
function removeJsxExpressions(jsx: string): string {
  let result = '';
  let i = 0;

  while (i < jsx.length) {
    if (jsx[i] !== '{') {
      result += jsx[i];
      i++;
      continue;
    }

    // Found `{` — extract the full expression with nested brace tracking
    const exprStart = i;
    let depth = 1;
    i++; // skip opening `{`

    while (i < jsx.length && depth > 0) {
      const ch = jsx[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '"' || ch === "'" || ch === '`') {
        // Skip string literals inside expression
        const quote = ch;
        i++;
        while (i < jsx.length) {
          if (jsx[i] === '\\') { i++; }
          else if (jsx[i] === quote) break;
          // Handle ${...} inside template literals
          else if (quote === '`' && jsx[i] === '$' && i + 1 < jsx.length && jsx[i + 1] === '{') {
            depth++;
            i++;
          }
          i++;
        }
      }
      i++;
    }

    const expr = jsx.substring(exprStart + 1, i - 1).trim();

    // Preserve simple string literals as plain text
    if (/^"([^"]*)"$/.test(expr)) {
      result += expr.slice(1, -1);
    } else if (/^'([^']*)'$/.test(expr)) {
      result += expr.slice(1, -1);
    } else if (/^`([^`]*)`$/.test(expr) && !expr.includes('${')) {
      // Simple template literal without interpolation
      result += expr.slice(1, -1);
    }
    // JSX inside expression (e.g., ternary with JSX) — try to extract HTML tags
    else if (expr.includes('<') && expr.includes('>')) {
      const htmlMatch = expr.match(/<[a-zA-Z][^]*>/);
      if (htmlMatch) {
        result += '<!-- dynamic content -->';
      }
    }
    // Everything else (variables, function calls, .map(), etc.) — remove
    // Leave empty to avoid leaking JS code into HTML
  }

  return result;
}

/**
 * Convert a single TSX page file to a complete HTML document for preview.
 * Enhanced to better extract HTML structure and preserve Tailwind classes.
 */
export function convertTSXPageToHTML(
  tsxContent: string,
  pageTitle: string,
  projectName: string,
  globalCssContent?: string,
): string {
  const jsx = extractJSXBody(tsxContent);

  if (!jsx || jsx.trim().length < 20) {
    // Enhanced fallback: Try to extract more meaningful content
    console.log('⚠️ JSX extraction failed or too short, creating enhanced fallback');
    
    const strings: string[] = [];
    // Extract string literals with better filtering
    const stringMatches = tsxContent.matchAll(/["'`]([A-Z][^"'`\n]{3,200})["'`]/g);
    for (const sm of stringMatches) {
      const str = sm[1].trim();
      // Filter out obvious code fragments, imports, etc
      if (!/^(import|export|const|let|var|function|class|interface|type|from|return)/.test(str) &&
          !str.includes('*/') &&
          !str.includes('//')) {
        strings.push(str);
      }
    }

    // Extract any existing JSX tags as hints
    const htmlTags: string[] = [];
    const tagMatches = tsxContent.matchAll(/<([a-z][a-z0-9]*)[^>]*className=["']([^"']+)["'][^>]*>(.*?)<\/\1>/gi);
    for (const tm of tagMatches) {
      const tag = tm[1];
      const classes = tm[2];
      const content = tm[3];
      if (content && content.length > 3 && content.length < 200) {
        htmlTags.push(`<${tag} class="${classes}">${content}</${tag}>`);
      }
    }

    const fallbackContent = htmlTags.length > 0
      ? `<div class="max-w-4xl mx-auto p-8">
          <h1 class="text-3xl font-bold mb-6">${pageTitle}</h1>
          <div class="space-y-4">
            ${htmlTags.slice(0, 12).join('\n            ')}
          </div>
        </div>`
      : strings.length > 0
      ? `<div class="max-w-4xl mx-auto p-8">
          <h1 class="text-3xl font-bold mb-6">${pageTitle}</h1>
          <div class="space-y-3">
            ${strings.slice(0, 10).map(s => `<p class="text-gray-700">${s}</p>`).join('\n            ')}
          </div>
        </div>`
      : `<div class="max-w-4xl mx-auto p-8 text-center">
          <h1 class="text-3xl font-bold mb-4">${pageTitle}</h1>
          <p class="text-gray-600 mb-6">This page uses interactive React components that require a live server to render.</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 inline-block text-left">
            <p class="font-medium text-blue-900 mb-2">To see this page:</p>
            <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Use the <strong>WebContainer live preview</strong> (if available)</li>
              <li>Or <strong>download the project</strong> and run it locally</li>
            </ul>
          </div>
        </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - ${projectName}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${globalCssContent ? `<style>${globalCssContent}</style>` : ''}
</head>
<body class="bg-gray-50">
${fallbackContent}
</body>
</html>`;
  }

  console.log(`✅ TSX→HTML conversion successful for ${pageTitle}: ${jsx.length} chars`);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - ${projectName}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${globalCssContent ? `<style>${globalCssContent}</style>` : ''}
</head>
<body>
${jsx}
</body>
</html>`;
}

/**
 * Extract page routes from a multi-file project.
 * Returns an array of { slug, title, content (HTML), isHomepage, order }.
 */
export function extractPagesFromProject(project: MultiFileProject): Array<{
  slug: string;
  title: string;
  content: string;
  isHomepage: boolean;
  order: number;
}> {
  // Find global CSS (globals.css or similar)
  const globalCssFile = project.files.find(f =>
    f.path.includes('globals.css') || f.path.includes('global.css')
  );
  const globalCss = globalCssFile?.content || '';

  // Find all page files: app/page.tsx, app/about/page.tsx, app/(group)/page.tsx, etc.
  // Handle multiple route groups, nested segments, etc.
  // Pattern: app/ followed by any mix of (group)/ or segment/ ending with page.tsx
  const pageFiles = project.files.filter(f =>
    /^(?:src\/)?app\/(?:(?:\([^)]+\)|\w[\w-]*)\/)*page\.(tsx|jsx|ts|js)$/.test(f.path)
  );

  console.log(`📄 Found ${pageFiles.length} page files:`, pageFiles.map(f => f.path));
  
  // Also check for HTML files as fallback
  const htmlFiles = project.files.filter(f => f.path.toLowerCase().endsWith('.html'));
  if (htmlFiles.length > 0 && pageFiles.length === 0) {
    console.log(`📄 No page.tsx files found, but found ${htmlFiles.length} HTML files. These won't be auto-extracted.`);
  }

  if (pageFiles.length === 0) return [];

  const pages: Array<{
    slug: string;
    title: string;
    content: string;
    isHomepage: boolean;
    order: number;
  }> = [];

  for (let i = 0; i < pageFiles.length; i++) {
    const file = pageFiles[i];

    // Skip dynamic route segments like [id], [slug] — can't preview those
    if (/\[/.test(file.path)) {
      console.log(`⏭️ Skipping dynamic route: ${file.path} (contains parameter)`);
      continue;
    }

    // Extract route from path, stripping src/app prefix and route groups like (dashboard)
    const cleanPath = file.path
      .replace(/^(?:src\/)?app\//, '')    // strip app/ prefix
      .replace(/\([^)]+\)\//g, '')         // strip route groups like (dashboard)/
      .replace(/\/?page\.\w+$/, '');       // strip page.tsx suffix (with or without leading /)

    const isHome = cleanPath === '';
    const routeSegment = isHome ? '' : cleanPath;
    const slug = isHome ? 'home' : routeSegment.replace(/\//g, '-');
    const title = isHome
      ? 'Home'
      : routeSegment
          .split('/')
          .pop()!
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
          .trim() || slug;

    let htmlContent = convertTSXPageToHTML(file.content, title, project.projectName, globalCss);

    // Enhanced validation: Check for quality issues in the generated HTML
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch?.[1]?.trim() || '';
    
    // Detect corrupted or low-quality content
    const hasMinimalContent = bodyContent.length < 50;
    const hasJSONFragments = /["']\s*:\s*["']/.test(bodyContent) || /\{\s*["']path["']\s*:/.test(bodyContent);
    const hasOnlyFallbackMessage = bodyContent.includes('require a live server to render');
    const hasMostlyDynamicComments = (bodyContent.match(/<!--\s*dynamic\s*content\s*-->/gi) || []).length > 5;
    
    const needsEnhancedFallback = hasMinimalContent || hasJSONFragments || (hasOnlyFallbackMessage && bodyContent.length < 300) || hasMostlyDynamicComments;
    
    if (needsEnhancedFallback) {
      console.log(`⚠️ Page quality issue for ${file.path}:`, {
        bodyLength: bodyContent.length,
        hasJSON: hasJSONFragments,
        hasFallback: hasOnlyFallbackMessage,
        dynamicComments: hasMostlyDynamicComments
      });
      console.log('  → Creating enhanced fallback with extracted content');
      
      // Extract all meaningful text strings from the original TSX
      const extractedStrings: string[] = [];
      const stringMatches = file.content.matchAll(/["'`]([A-Z][^"'`\n]{3,300})["'`]/g);
      for (const sm of stringMatches) {
        const str = sm[1].trim();
        // Filter out code keywords, imports, and fragments
        if (!/^(import|export|const|let|var|function|return|from|interface|type|class)/.test(str) &&
            !str.includes('*/') && !str.includes('//') && !str.includes('className') &&
            str.length > 5 && str.length < 150) {
          extractedStrings.push(str);
        }
      }

      // Extract JSX elements with their classes for better preview
      const jsxElements: string[] = [];
      const elementMatches = file.content.matchAll(/<(div|section|article|header|nav|h[1-6]|p|span|button|a)[^>]*className=["']([^"']+)["'][^>]*>((?:(?!<\/\1>).)*)<\/\1>/gis);
      for (const em of elementMatches) {
        const tag = em[1];
        const classes = em[2];
        let content = em[3].trim();
        // Remove nested JSX tags and expressions
        content = content.replace(/{[^}]+}/g, '').replace(/<[^>]+>/g, ' ').trim();
        if (content && content.length > 2 && content.length < 200 && !/^(import|export|const|let|var|function)/.test(content)) {
          jsxElements.push(`<${tag} class="${classes}">${content}</${tag}>`);
        }
      }

      const hasExtractedContent = extractedStrings.length > 0 || jsxElements.length > 0;
      
      const enhancedFallback = hasExtractedContent
        ? `<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div class="max-w-5xl mx-auto p-8">
              <h1 class="text-4xl font-bold text-gray-900 mb-2">${title}</h1>
              <p class="text-sm text-gray-500 mb-8">Preview extracted from React components</p>
              
              ${jsxElements.length > 0 ? `
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Page Components</h2>
                <div class="space-y-3">
                  ${jsxElements.slice(0, 15).join('\n                  ')}
                </div>
              </div>` : ''}
              
              ${extractedStrings.length > 0 ? `
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Page Content</h2>
                <div class="prose prose-gray max-w-none space-y-2">
                  ${extractedStrings.slice(0, 20).map((s, i) => 
                    i === 0 ? `<p class="text-lg font-medium text-gray-900">${s}</p>` : 
                    `<p class="text-gray-700">${s}</p>`
                  ).join('\n                  ')}
                </div>
              </div>` : ''}
              
              <div class="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                <div class="flex items-start">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-blue-900">Interactive Preview Unavailable</h3>
                    <p class="mt-1 text-sm text-blue-700">This page uses React components and requires a live development server.</p>
                    <p class="mt-2 text-sm text-blue-600">→ Use <strong>WebContainer preview</strong> or <strong>download the project</strong> to see full functionality.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>`
        : `<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
            <div class="max-w-2xl w-full">
              <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
                <div class="text-6xl mb-6">⚡</div>
                <h1 class="text-3xl font-bold text-gray-900 mb-4">${title}</h1>
                <p class="text-lg text-gray-600 mb-8">This React page requires a live server to display interactive components.</p>
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
                  <h3 class="font-semibold text-blue-900 mb-3">How to view this page:</h3>
                  <ul class="space-y-2 text-sm text-blue-800">
                    <li class="flex items-start gap-2">
                      <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span><strong>WebContainer Preview:</strong> If available, switch to live preview mode</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span><strong>Download Project:</strong> Run <code class="bg-blue-100 px-1.5 py-0.5 rounded text-xs">npm install && npm run dev</code> locally</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>`;
          
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${project.projectName}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${globalCss ? `<style>${globalCss}</style>` : ''}
</head>
<body class="antialiased">
${enhancedFallback}
</body>
</html>`;
    }

    pages.push({ slug, title, content: htmlContent, isHomepage: isHome, order: i });
    console.log(`✅ Extracted page: ${title} (${slug}) from ${file.path}`);
  }

  // Sort: homepage first, then alphabetically
  pages.sort((a, b) => {
    if (a.isHomepage) return -1;
    if (b.isHomepage) return 1;
    return a.title.localeCompare(b.title);
  });

  // Re-assign order after sort
  pages.forEach((p, idx) => { p.order = idx; });

  console.log(`📊 Total valid pages extracted: ${pages.length}`);
  return pages;
}

/**
 * Convert multi-file project to single HTML preview (for backward compatibility)
 */
export function convertToSingleHTML(project: MultiFileProject): string {
  // Try to convert the home page TSX to HTML for a real preview
  // Check exact paths first, then route groups like app/(store)/page.tsx
  const pageFile = project.files.find(f => f.path === 'app/page.tsx' || f.path === 'src/app/page.tsx')
    || project.files.find(f => /^(?:src\/)?app\/\([^)]+\)\/page\.(tsx|jsx|ts|js)$/.test(f.path));

  if (pageFile) {
    const globalCssFile = project.files.find(f =>
      f.path.includes('globals.css') || f.path.includes('global.css')
    );
    const preview = convertTSXPageToHTML(
      pageFile.content,
      'Home',
      project.projectName,
      globalCssFile?.content || '',
    );
    // Only use it if we got meaningful JSX content
    if (preview.length > 300) return preview;
  }

  // Fallback: project summary page
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.projectName}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-4">${project.projectName}</h1>
      <p class="text-gray-600 mb-8">${project.description}</p>
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-semibold mb-4">Project Files</h2>
        <ul class="space-y-2">
          ${project.files.map(f => `<li class="text-sm font-mono text-gray-700">${f.path}</li>`).join('\n')}
        </ul>
      </div>
      ${project.setupInstructions.length > 0 ? `
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">Setup Instructions</h3>
        <ol class="list-decimal list-inside space-y-1 text-blue-800">
          ${project.setupInstructions.map(i => `<li class="text-sm">${i}</li>`).join('\n')}
        </ol>
      </div>` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}
