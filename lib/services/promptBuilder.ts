/**
 * Prompt Builder Service
 * Builds appropriate system prompts for Claude based on iteration context
 */

import { IterationContext, FileInfo } from './iterationDetector';
import { BUILDFLOW_ENHANCED_SYSTEM_PROMPT } from '@/lib/prompts/buildflow-enhanced-prompt';
import { ENHANCED_GENERATION_SYSTEM_PROMPT } from '@/lib/enhanced-system-prompt';

/** True when the project contains TypeScript/fullstack files rather than plain HTML */
function isFullstackProject(files: FileInfo[]): boolean {
  return files.some(f =>
    f.path.endsWith('.ts') ||
    f.path.endsWith('.tsx') ||
    f.path.endsWith('.prisma') ||
    f.path === 'package.json' ||
    f.path.startsWith('app/') ||
    f.path.startsWith('lib/') ||
    f.path.startsWith('prisma/')
  );
}

/**
 * Output-format instructions appended to every iteration prompt so Claude
 * knows exactly how to return modified files back to the parser.
 */
const ITERATION_OUTPUT_FORMAT = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 ITERATION OUTPUT FORMAT (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY file you create or modify output it like this:

// File: path/to/file.tsx
<complete file content>

Rules:
1. Output the COMPLETE file — never partial diffs or snippets
2. Use the exact path from <project_context> for files that already exist
3. Only output files that changed — omit untouched files entirely
4. For fullstack/JSON projects wrap files in the standard JSON envelope;
   for HTML projects output raw HTML with // File: markers
5. No explanatory prose between files — code only
6. New files that didn't previously exist: use their intended path
`;

export class PromptBuilder {

  private baseSystemPrompt: string | null;

  constructor(baseSystemPrompt?: string) {
    // null = auto-detect from project files at build time
    this.baseSystemPrompt = baseSystemPrompt ?? null;
  }

  /** Pick the right base prompt: fullstack projects get the JSON-output prompt */
  private resolveBase(context: IterationContext): string {
    if (this.baseSystemPrompt !== null) return this.baseSystemPrompt;
    return isFullstackProject(context.existingFiles)
      ? ENHANCED_GENERATION_SYSTEM_PROMPT
      : BUILDFLOW_ENHANCED_SYSTEM_PROMPT;
  }

  /**
   * Builds complete system prompt based on context
   */
  buildSystemPrompt(context: IterationContext): string {
    if (!context.isIteration) {
      return this.buildNewProjectPrompt();
    }

    switch (context.changeScope) {
      case 'small':
        return this.buildSmallIterationPrompt(context);
      case 'medium':
        return this.buildMediumIterationPrompt(context);
      case 'large':
        return this.buildLargeIterationPrompt(context);
      default:
        return this.buildNewProjectPrompt();
    }
  }

  /**
   * Prompt for new project generation
   */
  private buildNewProjectPrompt(): string {
    const base = this.baseSystemPrompt ?? BUILDFLOW_ENHANCED_SYSTEM_PROMPT;
    return `${base}

<generation_mode>
NEW PROJECT MODE

You are generating a brand new application from scratch. Create all necessary files and structure.

Guidelines:
- Generate complete, production-ready code
- Follow all quality standards
- Create comprehensive file structure
- Implement all requested features
- Ensure mobile responsiveness
- Add proper error handling
</generation_mode>`;
  }

  /**
   * Prompt for small iterations (styling, minor tweaks)
   */
  private buildSmallIterationPrompt(context: IterationContext): string {
    const base = this.resolveBase(context);
    const filesList = this.formatFilesList(context.existingFiles);

    return `${base}

<generation_mode>
SMALL ITERATION MODE

The user wants to make a targeted, surgical change to an existing project.

Current Project Files:
${filesList}

CRITICAL INSTRUCTIONS:
1. ONLY modify the specific section the user mentioned
2. Do NOT regenerate files that don't need to change
3. Preserve ALL existing functionality, styles, and structure
4. Output the COMPLETE modified file — never just the diff

Workflow:
Step 1: Identify the exact file and section to change
Step 2: Make only the requested change
Step 3: Return the full modified file using the output format below
</generation_mode>
${ITERATION_OUTPUT_FORMAT}`;
  }

  /**
   * Prompt for medium iterations (new features, pages)
   */
  private buildMediumIterationPrompt(context: IterationContext): string {
    const base = this.resolveBase(context);
    const filesList = this.formatFilesList(context.existingFiles);
    const featureSummary = this.extractFeatureSummary(context);

    return `${base}

<generation_mode>
MEDIUM ITERATION MODE

The user wants to add significant new functionality to an existing project.

Current Project Files:
${filesList}

${featureSummary}

CRITICAL INSTRUCTIONS:
1. Create NEW files for genuinely new functionality
2. Modify existing files only where integration requires it
3. Preserve all unrelated files completely — do NOT output them
4. Maintain the exact same code style as the existing files
5. Update navigation/routing where new pages are added
6. Output each changed or new file in full using the format below
</generation_mode>
${ITERATION_OUTPUT_FORMAT}`;
  }

  /**
   * Prompt for large iterations (major changes)
   */
  private buildLargeIterationPrompt(context: IterationContext): string {
    const base = this.resolveBase(context);
    const filesList = this.formatFilesList(context.existingFiles);

    return `${base}

<generation_mode>
LARGE ITERATION MODE

The user wants to make significant changes to an existing project.

Current Project Files:
${filesList}

IMPORTANT CONSIDERATIONS:
The user has requested major changes that may require substantial modifications.

Approach:
1. Acknowledge the scope of changes
2. Modify existing code where feasible
3. Create new files for completely new features
4. Preserve working code where possible
5. Ensure no data/functionality loss
6. Maintain consistent architecture

Workflow:
Step 1: Read the current files in full
Step 2: Plan migration/modification strategy — note which files need changes
Step 3: Execute changes systematically
Step 4: Output every modified/new file in full using the format below
Step 5: Do NOT output files that were not changed
</generation_mode>
${ITERATION_OUTPUT_FORMAT}`;
  }

  /**
   * Formats files list for prompt — includes FULL file contents so Claude
   * can actually read and modify the existing code during iterations.
   *
   * Smart truncation: cap total payload at ~300 KB to stay well inside
   * Claude's 200 K-token context window.  Low-value config files are
   * truncated first; source code is preserved in full.
   */
  private formatFilesList(files: FileInfo[]): string {
    if (files.length === 0) return 'No files yet.';

    const MAX_TOTAL_CHARS = 300_000; // ~75 K tokens — safe headroom

    // Low-value files that can be truncated if space is tight
    const lowPriorityExts = new Set(['.json', '.md', '.lock', '.env.example', '.gitignore'])
    const isLowPriority = (f: FileInfo) =>
      lowPriorityExts.has('.' + (f.filename.split('.').pop() ?? '')) ||
      f.filename.toLowerCase().includes('package-lock') ||
      f.filename.toLowerCase().includes('yarn.lock')

    // Sort: high-priority (source) first, low-priority last
    const sorted = [...files].sort((a, b) => {
      const aLow = isLowPriority(a) ? 1 : 0
      const bLow = isLowPriority(b) ? 1 : 0
      return aLow - bLow
    })

    let totalChars = 0
    const parts: string[] = []

    for (const file of sorted) {
      const header = `\n### FILE: ${file.path}\n\`\`\`${this.langFromPath(file.path)}\n`
      const footer = '\n```\n'
      const overhead = header.length + footer.length

      if (totalChars + overhead > MAX_TOTAL_CHARS) {
        // No room at all — list remaining files as stubs
        parts.push(`- ${file.path} (${file.content.split('\n').length} lines — omitted to fit context)`)
        continue
      }

      const available = MAX_TOTAL_CHARS - totalChars - overhead
      let body = file.content

      if (body.length > available) {
        // Truncate but keep beginning (most important) + note
        body = body.slice(0, available - 100) + '\n// ... (truncated to fit context window)'
      }

      parts.push(`${header}${body}${footer}`)
      totalChars += header.length + body.length + footer.length
    }

    return parts.join('')
  }

  /** Returns a markdown language identifier for syntax highlighting */
  private langFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      css: 'css', html: 'html', json: 'json', md: 'markdown',
      sql: 'sql', prisma: 'prisma', env: '', sh: 'bash', yaml: 'yaml', yml: 'yaml',
    }
    return map[ext] ?? ''
  }

  /**
   * Extracts summary of existing features from files
   */
  private extractFeatureSummary(context: IterationContext): string {
    const htmlFiles = context.existingFiles.filter(f => f.type === 'html');
    const jsFiles = context.existingFiles.filter(f => f.type === 'js' || f.type === 'typescript');
    const cssFiles = context.existingFiles.filter(f => f.type === 'css');

    const features: string[] = [];

    if (htmlFiles.length > 0) {
      features.push(`HTML Pages: ${htmlFiles.map(f => f.filename).join(', ')}`);
    }

    if (jsFiles.length > 0) {
      features.push(`JavaScript/TypeScript: ${jsFiles.length} file(s)`);
    }

    if (cssFiles.length > 0) {
      features.push(`Stylesheets: ${cssFiles.length} file(s)`);
    }

    // Extract features from previous prompts
    const previousFeatures = this.extractFeaturesFromHistory(
      context.previousPrompts
    );

    if (previousFeatures.length > 0) {
      features.push(`\nPreviously Implemented:\n${previousFeatures.join('\n')}`);
    }

    return features.length > 0
      ? `<current_features>\n${features.join('\n')}\n</current_features>`
      : '';
  }

  /**
   * Extracts implemented features from conversation history
   */
  private extractFeaturesFromHistory(prompts: string[]): string[] {
    const features: string[] = [];
    
    prompts.forEach(prompt => {
      const content = prompt.toLowerCase();
      
      // Extract feature mentions
      if (content.includes('authentication') || content.includes('auth')) {
        features.push('- User authentication system');
      }
      if (content.includes('dashboard')) {
        features.push('- Dashboard interface');
      }
      if (content.includes('database') || content.includes('db')) {
        features.push('- Database integration');
      }
      if (content.includes('api')) {
        features.push('- API endpoints');
      }
      if (content.includes('contact') || content.includes('form')) {
        features.push('- Contact form');
      }
      if (content.includes('blog')) {
        features.push('- Blog functionality');
      }
      if (content.includes('portfolio')) {
        features.push('- Portfolio showcase');
      }
    });

    return [...new Set(features)]; // Remove duplicates
  }

}

/**
 * Helper to build user message with context.
 * Includes FULL file contents so Claude can actually read and modify the
 * existing code — not just know that files exist.
 */
export function buildUserMessageWithContext(
  userMessage: string,
  context: IterationContext
): string {
  if (!context.isIteration || context.existingFiles.length === 0) {
    return userMessage;
  }

  // Build a compact but complete listing of every existing file
  const MAX_TOTAL_CHARS = 250_000 // ~62 K tokens — leaves room for user message + response
  let totalChars = 0
  const fileParts: string[] = []

  for (const file of context.existingFiles) {
    const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      css: 'css', html: 'html', json: 'json', sql: 'sql', prisma: 'prisma',
    }
    const lang = langMap[ext] ?? ''
    const block = `\n<file path="${file.path}">\n\`\`\`${lang}\n${file.content}\n\`\`\`\n</file>`

    if (totalChars + block.length > MAX_TOTAL_CHARS) {
      fileParts.push(`\n<file path="${file.path}" truncated="true">(omitted — context limit reached)</file>`)
      continue
    }
    fileParts.push(block)
    totalChars += block.length
  }

  return `${userMessage}

<project_context>
This is an iteration on an existing project. All current files are shown below.
Modify ONLY what is necessary to fulfil the request and preserve all existing functionality.
${fileParts.join('')}
</project_context>`
}
