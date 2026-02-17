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
  // Look for the last occurrence of `}` followed by `,` or `]` or end of structure
  // which indicates a complete object entry in an array.
  // We search backwards for `},` or `}]` patterns.
  // These indicate the end of a complete file object in the files array.

  // Strategy: find the last `},` (end of a complete object in array)
  // or `}` followed by whitespace and `]` (last object in array)
  const patterns = [
    /\}\s*,\s*(?=\s*\{|\s*\])/g,  // }, before next { or ]
    /\}\s*\]/g,                     // }] end of array
    /"\s*,\s*(?=\s*")/g,           // ", between string array items
  ];

  let bestPos = 0;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(json)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos > bestPos) bestPos = endPos;
    }
  }

  return bestPos;
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

      // Step 1: Close any unterminated string at the end.
      // Find if we're inside an open string by scanning from the end.
      // Truncation typically leaves a string value unclosed.
      // Strategy: find the last complete key-value pair and truncate there.
      const lastCompleteEntry = findLastCompleteJsonEntry(jsonString);
      if (lastCompleteEntry > 0) {
        jsonString = jsonString.substring(0, lastCompleteEntry);
        console.log(`🔧 Truncated to last complete entry at position ${lastCompleteEntry}`);
      } else {
        // Fallback: try to close an unterminated string
        // Check if we're inside an open string (odd number of unescaped quotes)
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
          // Odd quotes = unterminated string — close it
          jsonString += '"';
          console.log('🔧 Closed unterminated string');
        }
      }

      // Step 2: Recount and add missing closing brackets/braces
      const ob = (jsonString.match(/{/g) || []).length;
      const cb = (jsonString.match(/}/g) || []).length;
      const oB = (jsonString.match(/\[/g) || []).length;
      const cB = (jsonString.match(/\]/g) || []).length;

      for (let i = 0; i < (oB - cB); i++) jsonString += ']';
      for (let i = 0; i < (ob - cb); i++) jsonString += '}';
      console.log('🔧 Added missing closing characters');
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString.trim());

    // Validate required fields
    if (!parsed.projectName || !parsed.files || !Array.isArray(parsed.files)) {
      return {
        success: false,
        error: 'Invalid project structure: missing projectName or files array',
      };
    }

    // Ensure all files have path and content
    const validFiles = parsed.files.every((f: { path?: string; content?: string }) => f.path && f.content);
    if (!validFiles) {
      return {
        success: false,
        error: 'Invalid files: each file must have path and content',
      };
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
  // We look for `export default function` or the last top-level return with `(`.
  // Then use parenthesis depth tracking to extract the full JSX body.

  // Find all `return (` positions
  const returnRegex = /\breturn\s*\(/g;
  const returnPositions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = returnRegex.exec(tsxContent)) !== null) {
    returnPositions.push(m.index);
  }

  if (returnPositions.length === 0) return '';

  // Prefer the return inside `export default function` if found
  const exportDefaultMatch = tsxContent.match(/export\s+default\s+function\s+\w*/);
  let targetReturnPos = returnPositions[returnPositions.length - 1]; // fallback: last return

  if (exportDefaultMatch && exportDefaultMatch.index !== undefined) {
    // Find the first `return (` after the export default function declaration
    const exportPos = exportDefaultMatch.index;
    const afterExport = returnPositions.find(p => p > exportPos);
    if (afterExport !== undefined) {
      targetReturnPos = afterExport;
    }
  }

  // Find the opening `(` after `return`
  const afterReturn = tsxContent.indexOf('(', targetReturnPos);
  if (afterReturn === -1) return '';

  // Use depth tracking to find the matching closing `)`
  let depth = 0;
  let start = -1;
  let end = -1;

  for (let i = afterReturn; i < tsxContent.length; i++) {
    const ch = tsxContent[i];
    // Skip string literals
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < tsxContent.length) {
        if (tsxContent[i] === '\\') { i++; } // skip escaped chars
        else if (tsxContent[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === '(') {
      if (depth === 0) start = i + 1; // content starts after opening paren
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (start === -1 || end === -1 || end <= start) return '';

  let jsx = tsxContent.substring(start, end).trim();

  // Sanity check: JSX should start with < (an HTML/JSX tag)
  if (!jsx.startsWith('<')) return '';

  // Reject if it contains raw JSON structure (corrupted content)
  if (/"\s*:\s*"/.test(jsx) || /\{\s*"path"\s*:/.test(jsx)) return '';

  // Convert common JSX-isms to plain HTML
  jsx = jsxToHtml(jsx);

  return jsx;
}

/**
 * Convert JSX string to plain HTML for preview.
 */
function jsxToHtml(jsx: string): string {
  return jsx
    // className → class
    .replace(/\bclassName=/g, 'class=')
    // Remove {` ... `} template literals → just the string
    .replace(/\{`([^`]*)`\}/g, '$1')
    // Remove simple string literal expressions like {"text"}
    .replace(/\{"([^"]{0,200})"\}/g, '$1')
    .replace(/\{'([^']{0,200})'\}/g, '$1')
    // Remove JSX map/filter expressions — replace with placeholder items
    .replace(/\{[\s\S]{0,500}?\.map\([\s\S]*?\)\s*\}/g, '<!-- dynamic list -->')
    // Remove ternary expressions {cond ? <A/> : <B/>} — keep first branch
    .replace(/\{[^{}]*\?\s*(<[^{}]*>)\s*:\s*<[^{}]*>\s*\}/g, '$1')
    // Remove remaining JS expressions like {variable}
    .replace(/\{[^{}]{0,300}\}/g, '')
    // htmlFor → for
    .replace(/\bhtmlFor=/g, 'for=')
    // Self-closing tags that HTML doesn't support
    .replace(/<(div|span|p|section|main|header|footer|nav|ul|ol|li|h[1-6]|form|table|tbody|thead|tr|td|th|article|aside)\s*\/>/g, '<$1></$1>')
    // Remove onClick, onChange, onSubmit, etc. event handlers
    .replace(/\s+on[A-Z]\w+=[{"][^}"]*[}"]/g, '')
    // Remove React-specific attributes (ref, key, dangerouslySetInnerHTML)
    .replace(/\s+(ref|key|dangerouslySetInnerHTML)=[{"][^}"]*[}"]/g, '')
    // Clean up any leftover empty attributes
    .replace(/\s+=/g, '');
}

/**
 * Convert a single TSX page file to a complete HTML document for preview.
 */
export function convertTSXPageToHTML(
  tsxContent: string,
  pageTitle: string,
  projectName: string,
  globalCssContent?: string,
): string {
  const jsx = extractJSXBody(tsxContent);

  if (!jsx) {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} - ${projectName}</title><script src="https://cdn.tailwindcss.com"><\/script></head>
<body><div class="min-h-screen flex items-center justify-center"><p class="text-gray-500">Preview unavailable for this page</p></div></body></html>`;
  }

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
      console.log(`⏭️ Skipping dynamic route: ${file.path}`);
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

    const htmlContent = convertTSXPageToHTML(file.content, title, project.projectName, globalCss);

    // Validate: skip pages with no meaningful content (< 100 chars of body)
    // or that contain raw JSON fragments (corrupted parse)
    const bodyMatch = htmlContent.match(/<body>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch?.[1]?.trim() || '';
    if (bodyContent.length < 20 || /"\s*:\s*"/.test(bodyContent) || /\{\s*"path"\s*:/.test(bodyContent)) {
      console.log(`⏭️ Skipping page with invalid content: ${file.path} (body: ${bodyContent.length} chars)`);
      continue;
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
