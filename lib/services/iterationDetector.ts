/**
 * Iteration Detector Service
 * Detects whether user request is an iteration or new generation
 */

import prisma from '@/lib/prisma';

export interface IterationContext {
  isIteration: boolean;
  projectId?: string;
  existingFiles: FileInfo[];
  changeScope: 'small' | 'medium' | 'large' | 'new';
  previousPrompts: string[];
}

export interface FileInfo {
  filename: string;
  path: string;
  content: string;
  lastModified: Date;
  type: 'html' | 'css' | 'js' | 'json' | 'typescript' | 'other';
}

export class IterationDetector {
  
  // Keywords that indicate user wants to modify existing code
  private static ITERATION_KEYWORDS = [
    'add', 'modify', 'update', 'change', 'enhance', 'improve',
    'fix', 'edit', 'adjust', 'include', 'remove', 'delete',
    'refactor', 'optimize', 'extend', 'integrate', 'append',
    'make', 'can you', 'please', 'also', 'now'
  ];

  // Keywords that indicate brand new generation
  private static NEW_PROJECT_KEYWORDS = [
    'create', 'build', 'generate', 'start from scratch',
    'new project', 'new app', 'new website', 'fresh start',
    'make me a', 'build me a'
  ];

  /**
   * Determines if user request is an iteration or new generation
   */
  static async detectIteration(
    userMessage: string,
    projectId: string | null | undefined
  ): Promise<IterationContext> {
    
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if project exists and has files
    const existingProject = projectId 
      ? await this.getProjectFiles(projectId)
      : null;

    // Case 1: No existing project - definitely new generation
    if (!existingProject || existingProject.files.length === 0) {
      return {
        isIteration: false,
        existingFiles: [],
        changeScope: 'new',
        previousPrompts: []
      };
    }

    // Case 2: User explicitly says "start fresh" or "new project"
    const explicitlyNew = this.NEW_PROJECT_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword) && 
      (lowerMessage.includes('fresh') || lowerMessage.includes('new'))
    );

    if (explicitlyNew) {
      return {
        isIteration: false,
        projectId: projectId || undefined,
        existingFiles: [],
        changeScope: 'new',
        previousPrompts: existingProject.previousPrompts
      };
    }

    // Case 3: Check for iteration keywords
    const hasIterationKeywords = this.ITERATION_KEYWORDS.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Case 4: Check if user references existing features
    const referencesExisting = this.detectExistingFeatureReference(
      lowerMessage,
      existingProject.files
    );

    // Case 5: Determine if this is an iteration
    const isIteration = (
      hasIterationKeywords || 
      referencesExisting ||
      existingProject.files.length > 0 // Has existing files
    );

    if (!isIteration) {
      return {
        isIteration: false,
        projectId: projectId || undefined,
        existingFiles: [],
        changeScope: 'new',
        previousPrompts: existingProject.previousPrompts
      };
    }

    // Determine change scope for iterations
    const changeScope = this.determineChangeScope(lowerMessage);

    return {
      isIteration: true,
      projectId: projectId || undefined,
      existingFiles: existingProject.files,
      changeScope,
      previousPrompts: existingProject.previousPrompts
    };
  }

  /**
   * Detects if user references existing code/features
   */
  private static detectExistingFeatureReference(
    message: string,
    files: FileInfo[]
  ): boolean {
    const fileNames = files.map(f => f.filename.toLowerCase());
    
    // Check if message mentions existing file names
    const mentionsFiles = fileNames.some(filename => 
      message.includes(filename.replace('.html', '').replace('.tsx', '').replace('.ts', ''))
    );

    // Check for references to existing components
    const componentReferences = [
      'the header', 'the footer', 'the navigation', 'nav bar',
      'the sidebar', 'the form', 'the button', 'the modal',
      'existing', 'current', 'this app', 'this project', 'this page',
      'the app', 'the website', 'the site'
    ];

    const referencesComponents = componentReferences.some(ref =>
      message.includes(ref)
    );

    return mentionsFiles || referencesComponents;
  }

  /**
   * Determines the scope of changes needed
   */
  private static determineChangeScope(message: string): 'small' | 'medium' | 'large' {
    const lowerMessage = message.toLowerCase();

    // Small scope indicators
    const smallIndicators = [
      'button', 'color', 'style', 'css', 'text', 'font',
      'spacing', 'margin', 'padding', 'border', 'shadow',
      'fix', 'bug', 'typo', 'alignment', 'size'
    ];

    // Large scope indicators
    const largeIndicators = [
      'redesign', 'rebuild', 'rewrite', 'complete', 'entire',
      'framework', 'architecture', 'from scratch', 'overhaul',
      'completely', 'whole'
    ];

    if (largeIndicators.some(ind => lowerMessage.includes(ind))) {
      return 'large';
    }

    if (smallIndicators.some(ind => lowerMessage.includes(ind))) {
      return 'small';
    }

    // Default to medium for most feature additions
    return 'medium';
  }

  /**
   * Gets existing project files from database
   */
  private static async getProjectFiles(
    projectId: string
  ): Promise<{ files: FileInfo[]; previousPrompts: string[] } | null> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          ProjectFile: true,
          ProjectVersion: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (!project) return null;

      // Convert ProjectFile to FileInfo format
      const files: FileInfo[] = project.ProjectFile.map(file => ({
        filename: file.path.split('/').pop() || file.path,
        path: file.path,
        content: file.content,
        lastModified: file.updatedAt || file.createdAt || new Date(),
        type: this.getFileType(file.path)
      }));

      // Get previous prompts from versions
      const previousPrompts = project.ProjectVersion
        .map(v => v.description)
        .filter((desc): desc is string => desc !== null);

      return {
        files,
        previousPrompts
      };
    } catch (error) {
      console.error('Error fetching project files:', error);
      return null;
    }
  }

  /**
   * Determines file type from path
   */
  private static getFileType(path: string): FileInfo['type'] {
    const ext = path.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
      case 'jsx':
        return 'js';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      default:
        return 'other';
    }
  }
}
