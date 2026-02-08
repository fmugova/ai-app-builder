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
          // Valid escape - keep as is
          fixedString += char;
          i++;
        } else {
          // Invalid escape - double the backslash
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

    // If JSON seems truncated, try to close it properly
    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      console.warn('⚠️ JSON appears truncated, attempting to repair...');
      // Add missing closing brackets/braces
      for (let i = 0; i < (openBrackets - closeBrackets); i++) {
        jsonString += ']';
      }
      for (let i = 0; i < (openBraces - closeBraces); i++) {
        jsonString += '}';
      }
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
 * Convert multi-file project to single HTML preview (for backward compatibility)
 */
export function convertToSingleHTML(project: MultiFileProject): string {
  // For now, if it's a Next.js project, create a simple preview HTML
  const pageFile = project.files.find(f => f.path === 'app/page.tsx');
  
  if (!pageFile) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
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

      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">Setup Instructions</h3>
        <ol class="list-decimal list-inside space-y-1 text-blue-800">
          ${project.setupInstructions.map(i => `<li class="text-sm">${i}</li>`).join('\n')}
        </ol>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  // Return basic preview
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gray-50 p-8">
    <h1 class="text-4xl font-bold">${project.projectName}</h1>
    <p class="text-gray-600 mt-4">${project.description}</p>
    <div class="mt-8 bg-white rounded-lg shadow p-6">
      <p class="text-gray-700">This is a Next.js application. Download the files to run locally.</p>
      <p class="text-sm text-gray-500 mt-4">Files: ${project.files.length}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
