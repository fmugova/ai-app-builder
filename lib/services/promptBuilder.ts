/**
 * Prompt Builder Service
 * Builds appropriate system prompts for Claude based on iteration context
 */

import { IterationContext, FileInfo } from './iterationDetector';
import { BUILDFLOW_ENHANCED_SYSTEM_PROMPT } from '@/lib/prompts/buildflow-enhanced-prompt';

export class PromptBuilder {
  
  private baseSystemPrompt: string;

  constructor(baseSystemPrompt: string = BUILDFLOW_ENHANCED_SYSTEM_PROMPT) {
    this.baseSystemPrompt = baseSystemPrompt;
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
    return `${this.baseSystemPrompt}

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
    const filesList = this.formatFilesList(context.existingFiles);
    
    return `${this.baseSystemPrompt}

<generation_mode>
SMALL ITERATION MODE

The user wants to make minor changes to an existing project.

Current Project Files:
${filesList}

CRITICAL INSTRUCTIONS:
1. ONLY modify the specific section user mentioned
2. Do NOT regenerate existing files
3. Preserve ALL existing functionality
4. Make surgical, precise changes

Workflow:
Step 1: Identify the file that needs modification
Step 2: Locate the exact section to change
Step 3: Make only the requested change
Step 4: Verify change doesn't break anything
Step 5: Present the modified file

Example:
User: "Change the button color to blue"
Action: 
- Modify CSS for button color only
- Preserve everything else

DO NOT regenerate entire files for small changes!
</generation_mode>

<existing_project_summary>
This project has ${context.existingFiles.length} files. The user wants to make a minor modification. Your goal is surgical precision - change only what's necessary and preserve everything else.
</existing_project_summary>`;
  }

  /**
   * Prompt for medium iterations (new features, pages)
   */
  private buildMediumIterationPrompt(context: IterationContext): string {
    const filesList = this.formatFilesList(context.existingFiles);
    const featureSummary = this.extractFeatureSummary(context);
    
    return `${this.baseSystemPrompt}

<generation_mode>
MEDIUM ITERATION MODE

The user wants to add significant functionality to an existing project.

Current Project Files:
${filesList}

${featureSummary}

CRITICAL INSTRUCTIONS:
1. Create NEW files for genuinely new functionality
2. Modify existing files only where necessary for integration
3. Preserve unrelated files completely
4. Maintain consistency with existing code style
5. Update navigation/routing if adding new pages

Workflow:
Step 1: Understand existing structure
Step 2: Plan what needs to be created vs modified
Step 3: Create new files for new features
Step 4: Modify existing files only where necessary
Step 5: Test integration between old and new code
Step 6: Present both new and modified files

Example:
User: "Add a blog page to my portfolio"
Action:
- Create blog.html with matching style
- Modify navigation in other pages to include blog link
- Preserve all other pages exactly as they are

Balance: Add new features while respecting existing code.
</generation_mode>

<existing_project_summary>
This project has ${context.existingFiles.length} files. The user wants to add new functionality. Create new files for new features, but modify existing files minimally and only where integration is needed.
</existing_project_summary>`;
  }

  /**
   * Prompt for large iterations (major changes)
   */
  private buildLargeIterationPrompt(context: IterationContext): string {
    const filesList = this.formatFilesList(context.existingFiles);
    
    return `${this.baseSystemPrompt}

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
Step 1: Understand existing implementation
Step 2: Plan migration/modification strategy
Step 3: Execute changes systematically
Step 4: Verify no regressions
Step 5: Present comprehensive change summary
</generation_mode>

<existing_project_summary>
This project has ${context.existingFiles.length} files. The user wants major changes. Assess whether modification or regeneration is more appropriate for each file.
</existing_project_summary>`;
  }

  /**
   * Formats files list for prompt
   */
  private formatFilesList(files: FileInfo[]): string {
    if (files.length === 0) return 'No files yet.';

    return files.map(file => {
      const size = file.content.length;
      const lines = file.content.split('\n').length;
      return `- ${file.filename} (${lines} lines, ${this.formatBytes(size)})`;
    }).join('\n');
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

  /**
   * Formats bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

/**
 * Helper to build user message with context
 */
export function buildUserMessageWithContext(
  userMessage: string,
  context: IterationContext
): string {
  if (!context.isIteration) {
    return userMessage;
  }

  // Add context to user message
  let enhancedMessage = userMessage;

  if (context.existingFiles.length > 0) {
    enhancedMessage += '\n\n<project_context>';
    enhancedMessage += '\nThis is an iteration on an existing project.';
    enhancedMessage += `\nExisting files: ${context.existingFiles.map(f => f.filename).join(', ')}`;
    enhancedMessage += '\nPlease modify only what\'s necessary and preserve existing functionality.';
    enhancedMessage += '\n</project_context>';
  }

  return enhancedMessage;
}
