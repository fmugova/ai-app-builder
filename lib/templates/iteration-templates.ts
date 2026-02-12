/**
 * Iteration Detector Template for Generated Apps
 * This code gets injected into generated full-stack applications
 * to enable iteration detection and Supabase connectivity
 */

export const GENERATED_APP_ITERATION_DETECTOR = `
// ============================================================================
// ITERATION DETECTOR - Auto-injected by BuildFlow
// ============================================================================

class IterationDetector {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Detects if user is iterating on existing project or starting fresh
   */
  async detectIteration(prompt, projectId, conversationHistory = []) {
    // New project - no iteration
    if (!projectId) {
      return {
        isIteration: false,
        changeScope: null,
        existingFiles: [],
        previousPrompts: []
      };
    }

    try {
      // Get project files from Supabase
      const projectData = await this.getProjectFiles(projectId);
      
      if (!projectData || projectData.files.length === 0) {
        return {
          isIteration: false,
          changeScope: null,
          existingFiles: [],
          previousPrompts: []
        };
      }

      // Analyze prompt for iteration signals
      const changeScope = this.analyzeChangeScope(prompt, projectData.files);
      
      return {
        isIteration: true,
        changeScope,
        existingFiles: projectData.files,
        previousPrompts: projectData.previousPrompts,
        conversationHistory
      };
    } catch (error) {
      console.error('Iteration detection failed:', error);
      // Fallback to new project mode
      return {
        isIteration: false,
        changeScope: null,
        existingFiles: [],
        previousPrompts: []
      };
    }
  }

  /**
   * Fetches project files from Supabase
   */
  async getProjectFiles(projectId) {
    const { data: files, error } = await this.supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch project files:', error);
      throw error;
    }

    // Get conversation history for previous prompts
    const { data: history, error: historyError } = await this.supabase
      .from('conversation_history')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence_number', { ascending: true });

    const previousPrompts = history
      ? history.filter(h => h.role === 'user').map(h => h.content)
      : [];

    return {
      files: files.map(f => ({
        filename: f.filename,
        path: f.filename,
        content: f.content,
        lastModified: new Date(f.updated_at || f.created_at),
        type: this.getFileType(f.filename)
      })),
      previousPrompts
    };
  }

  /**
   * Analyzes prompt to determine change scope
   */
  analyzeChangeScope(prompt, existingFiles) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Small changes: styling, colors, text
    const smallKeywords = [
      'color', 'style', 'css', 'font', 'size', 'spacing', 
      'margin', 'padding', 'text', 'button', 'icon'
    ];
    
    // Large changes: new pages, major features
    const largeKeywords = [
      'page', 'section', 'dashboard', 'crud', 'authentication',
      'database', 'api', 'backend', 'complete', 'entire'
    ];

    const hasSmallKeywords = smallKeywords.some(kw => lowerPrompt.includes(kw));
    const hasLargeKeywords = largeKeywords.some(kw => lowerPrompt.includes(kw));

    if (hasLargeKeywords) return 'large';
    if (hasSmallKeywords) return 'small';
    return 'medium';
  }

  /**
   * Determines file type from filename
   */
  getFileType(filename) {
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.js')) return 'js';
    if (filename.endsWith('.json')) return 'json';
    return 'other';
  }
}

// ============================================================================
// PROMPT BUILDER - Auto-injected by BuildFlow
// ============================================================================

class PromptBuilder {
  constructor(baseSystemPrompt) {
    this.baseSystemPrompt = baseSystemPrompt;
  }

  /**
   * Builds system prompt based on iteration context
   */
  buildSystemPrompt(context) {
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

  buildNewProjectPrompt() {
    return \`\${this.baseSystemPrompt}

<generation_mode>NEW PROJECT</generation_mode>
Create complete application from scratch.\`;
  }

  buildSmallIterationPrompt(context) {
    const filesList = context.existingFiles
      .map(f => \`- \${f.filename} (\${f.type})\`)
      .join('\\n');

    return \`\${this.baseSystemPrompt}

<generation_mode>SMALL ITERATION</generation_mode>

Existing Files:
\${filesList}

INSTRUCTIONS:
- Make ONLY the requested change
- Preserve ALL existing functionality
- Return ONLY modified files
- Keep code style consistent\`;
  }

  buildMediumIterationPrompt(context) {
    const filesList = context.existingFiles
      .map(f => \`- \${f.filename} (\${f.type})\`)
      .join('\\n');

    return \`\${this.baseSystemPrompt}

<generation_mode>MEDIUM ITERATION</generation_mode>

Existing Files:
\${filesList}

INSTRUCTIONS:
- Create new files for new features
- Modify existing files only where needed
- Maintain consistency with existing code
- Return both new and modified files\`;
  }

  buildLargeIterationPrompt(context) {
    return \`\${this.baseSystemPrompt}

<generation_mode>LARGE ITERATION</generation_mode>

Major refactor or addition to existing project.
Previous prompts: \${context.previousPrompts.length}

INSTRUCTIONS:
- Significant changes are expected
- May regenerate multiple files
- Maintain core functionality
- Return all affected files\`;
  }
}

// ============================================================================
// PROJECT SERVICE - Auto-injected by BuildFlow
// ============================================================================

class ProjectService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Gets project with files
   */
  async getProject(projectId) {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*, project_files(*)')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Gets conversation history
   */
  async getConversationHistory(projectId) {
    const { data, error } = await this.supabase
      .from('conversation_history')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Saves conversation message
   */
  async saveConversationMessage(projectId, role, content, sequenceNumber) {
    const { error } = await this.supabase
      .from('conversation_history')
      .insert({
        project_id: projectId,
        role,
        content,
        sequence_number: sequenceNumber
      });

    if (error) throw error;
  }

  /**
   * Saves project files
   */
  async saveProjectFiles(projectId, files) {
    // Delete old files
    await this.supabase
      .from('project_files')
      .delete()
      .eq('project_id', projectId);

    // Insert new files
    const fileRecords = files.map(file => ({
      project_id: projectId,
      filename: file.filename,
      content: file.content,
      file_type: file.type
    }));

    const { error } = await this.supabase
      .from('project_files')
      .insert(fileRecords);

    if (error) throw error;
  }

  /**
   * Updates project metadata
   */
  async updateProjectMetadata(projectId, updates) {
    const { error } = await this.supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) throw error;
  }
}

// Export for use in generated apps
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IterationDetector, PromptBuilder, ProjectService };
}
`;

export const GENERATED_APP_SUPABASE_CONFIG = `
// ============================================================================
// SUPABASE CONFIGURATION - Auto-injected by BuildFlow
// ============================================================================

// Initialize Supabase client
// Replace with your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

const supabase = typeof window !== 'undefined' 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Initialize services
const iterationDetector = supabase ? new IterationDetector(supabase) : null;
const projectService = supabase ? new ProjectService(supabase) : null;
`;

export const GENERATED_APP_DATABASE_SCHEMA = `
-- ============================================================================
-- DATABASE SCHEMA FOR GENERATED APPS WITH ITERATION SUPPORT
-- Auto-generated by BuildFlow
-- ============================================================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project files table
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation history table
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sequence_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_conversation_project_id ON conversation_history(project_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sequence ON conversation_history(project_id, sequence_number);

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own project files"
  ON project_files FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own project files"
  ON project_files FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view own conversation history"
  ON conversation_history FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own conversation history"
  ON conversation_history FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));
`;
