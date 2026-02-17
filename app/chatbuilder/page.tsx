'use client';

import React, { Suspense } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { stripMarkdownCodeFences } from '@/lib/utils';
import { generateSmartProjectName } from '@/lib/utils/project-name-generator';
import dynamic from 'next/dynamic';
import PreviewFrame from '@/components/PreviewFrame'
import PreviewFrameMultiPage from '@/components/PreviewFrameMultiPage'
import MediaLibrary from '@/components/MediaLibrary';
import MonacoCodeEditor from '@/components/MonacoCodeEditor';
import MultiFileProjectSetup from '@/components/MultiFileProjectSetup';
import CodeFileViewer from '@/components/CodeFileViewer';
import PromptTemplates from '@/components/PromptTemplates';

// WebContainerPreview must be client-only (uses SharedArrayBuffer, Service Workers)
const WebContainerPreview = dynamic(
  () => import('@/components/WebContainerPreview'),
  { ssr: false },
);
import { parseMultiFileProject, convertToSingleHTML } from '@/lib/multi-file-parser';
import { parseGeneratedCode } from '@/lib/code-parser';
import { AlertTriangle, CheckCircle, XCircle, Download, Copy, Github, ExternalLink, Save, Sparkles, RefreshCw, Upload, Link as LinkIcon, Code2, Lightbulb, Menu, X, Wand2, ImageIcon } from 'lucide-react';

// Types remain the same as before...
interface ValidationMessage {
  message: string;
  line?: number;
  column?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

interface ValidationResult {
  isComplete: boolean;
  hasHtml: boolean;
  hasCss: boolean;
  hasJs: boolean;
  validationScore: number;
  validationPassed: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  cspViolations: string[];
  passed: boolean;
}

interface GenerationState {
  html: string;
  css: string;
  js: string;
  fullCode: string;
  isGenerating: boolean;
  validation: ValidationResult | null;
  progress: number;
  currentStep: string;
}

interface ProjectPage {
  id: string; slug: string; title: string; content: string;
  description: string | null; isHomepage: boolean; order: number;
  isPublished: boolean; metaTitle: string | null; metaDescription: string | null;
}

// Prompt Templates
const PROMPT_TEMPLATES = {
  simple: "Create a simple task manager app with a task list and add/delete functionality",
  complex: "Create a comprehensive CRM dashboard with contacts management, deal pipeline with drag-and-drop, analytics charts showing sales metrics, activity timeline, and settings page. Include search, filters, and data tables with pagination. Use modern design with sidebar navigation."
};

// Generate README.md content
function generateReadme(projectName: string, projectType: string, dependencies: Record<string, string>): string {
  const depsList = Object.entries(dependencies).map(([name, version]) => `- ${name}@${version}`).join('\n');
  
  return `# ${projectName}

A ${projectType} application built with Next.js, React, and TypeScript.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Extract the project**
   \`\`\`bash
   unzip ${projectName.toLowerCase().replace(/\s+/g, '-')}.zip
   cd ${projectName.toLowerCase().replace(/\s+/g, '-')}
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Set up environment variables**
   
   Create a \`.env.local\` file in the root directory:
   \`\`\`env
   DATABASE_URL="your-database-url"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open in browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

\`\`\`
${projectName}/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions
├── public/          # Static assets
├── prisma/          # Database schema
└── package.json     # Dependencies
\`\`\`

## Key Dependencies

${depsList}

## Deploy to Production

### Deploy to Vercel (Recommended)

1. **Sign up for Vercel**
   Visit [vercel.com](https://vercel.com) and create an account

2. **Install Vercel CLI**
   \`\`\`bash
   npm i -g vercel
   \`\`\`

3. **Deploy**
   \`\`\`bash
   vercel
   \`\`\`

4. **Set environment variables**
   Go to your Vercel dashboard → Project Settings → Environment Variables

### Alternative: Deploy to Netlify

1. Install Netlify CLI: \`npm i -g netlify-cli\`
2. Run: \`netlify deploy\`
3. Follow the prompts

## Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run lint\` - Run ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Support

For issues or questions, visit the [BuildFlow AI support page](https://buildflow.ai/support).

---

**Built with ❤️ using BuildFlow AI**
`;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PreviewFrame error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-red-50">
          <div className="text-center p-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Preview Error
            </h3>
            <p className="text-sm text-red-700">
              {this.state.error?.message || 'Something went wrong'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ChatBuilderContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showViewCode, setShowViewCode] = useState(false);
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [generationMode, setGenerationMode] = useState<'iterate' | 'fresh'>('iterate');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Multi-file project data
  const [projectFiles, setProjectFiles] = useState<Array<{path: string, content: string, language: string}>>([]);
  const [filesCount, setFilesCount] = useState(0);
  const [projectType, setProjectType] = useState('');
  const [projectDependencies, setProjectDependencies] = useState<Record<string, string>>({});

  // Multi-page project data (Page model)
  const [projectPages, setProjectPages] = useState<ProjectPage[]>([]);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageNameInput, setNewPageNameInput] = useState('');
  const [pendingNewPageName, setPendingNewPageName] = useState<string | null>(null);

  // Media library
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [attachedImageUrls, setAttachedImageUrls] = useState<string[]>([]);

  const fetchProjectPages = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/projects/${pid}/pages`);
      const data = await res.json();
      if (Array.isArray(data)) setProjectPages(data);
    } catch { /* non-fatal */ }
  }, []);
  
  const [state, setState] = useState<GenerationState>({
    html: '',
    css: '',
    js: '',
    fullCode: '',
    isGenerating: false,
    validation: null,
    progress: 0,
    currentStep: '',
  });

  const [showCodeQuality, setShowCodeQuality] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMultiFileProject, setIsMultiFileProject] = useState(false);
  const [useWebContainer, setUseWebContainer] = useState(true);
  const [webContainerFailed, setWebContainerFailed] = useState(false);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load project data
  const loadProject = useCallback(async (projectId: string) => {
    setIsLoadingProject(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to load project');
      }

      const data = await response.json();
      const project = data.project;
      
      setCurrentProjectId(project.id);
      setProjectName(project.name || '');
      
      if (project.code) {
        const { html, css, js } = parseCode(project.code);
        setState(prev => ({
          ...prev,
          html,
          css,
          js,
          fullCode: project.code,
          validation: project.validation || null,
        }));
        toast.success(`Loaded project: ${project.name}`);
      } else {
        toast.success(`Loaded project: ${project.name} (no code yet)`);
      }

      // Load multi-file project data (files, deps, type) for WebContainer preview
      if (project.isMultiFile && project.files && project.files.length > 0) {
        setIsMultiFileProject(true);
        setProjectFiles(project.files);
        setProjectType(project.projectType || 'fullstack');
        setProjectDependencies(
          typeof project.dependencies === 'string'
            ? JSON.parse(project.dependencies)
            : project.dependencies || {}
        );
        setFilesCount(project.files.length);
      }

      // Load pages if this is a multi-page project
      if (project.multiPage) {
        fetchProjectPages(project.id);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      toast.error(errorMessage);
    } finally {
      setIsLoadingProject(false);
    }
  }, [fetchProjectPages]);

  // Load project from URL parameter
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId && status === 'authenticated') {
      loadProject(projectId);
    }
  }, [searchParams, status, loadProject]);

  // Generation function with progress tracking
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    // Generate smart name if project name is empty
    if (!projectName || projectName.trim() === '') {
      const smartName = generateSmartProjectName(prompt);
      setProjectName(smartName);
      console.log('🏷️ Generated smart name:', smartName);
    }

    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      html: '', 
      css: '', 
      js: '', 
      fullCode: '', 
      progress: 0, 
      currentStep: 'Starting generation...' 
    }));
    
    try {
      const requestBody: { prompt: string; projectId?: string } = { 
        prompt: generationMode === 'fresh' ? `START FROM SCRATCH: ${prompt}` : prompt 
      };
      
      // Only include projectId if in iterate mode and it's a valid UUID string
      if (generationMode === 'iterate' && currentProjectId && currentProjectId.trim()) {
        requestBody.projectId = currentProjectId;
      }
      
      const response = await fetch('/api/chatbot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Generation API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || errorData.details || `Generation failed: ${response.status}`);
      }

      setState(prev => ({ ...prev, progress: 10, currentStep: 'Connected to AI...' }));

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.code) {
                accumulatedCode += data.code;
                chunkCount++;

                const progress = Math.min(80, 10 + (chunkCount * 0.5));
                setState(prev => ({ ...prev, progress, currentStep: 'Generating code...' }));

                // Throttle parsing: only parse every 10 chunks and when content looks parseable
                const shouldParse = chunkCount % 10 === 0 || accumulatedCode.length < 200;
                const hasParseable = accumulatedCode.includes('<') || accumulatedCode.trim().startsWith('{');

                if (shouldParse && hasParseable) {
                  const { html, css, js } = parseCode(accumulatedCode);
                  setState(prev => ({ ...prev, html, css, js, fullCode: accumulatedCode }));
                } else {
                  setState(prev => ({ ...prev, fullCode: accumulatedCode }));
                }
              }

              if (data.validation) {
                console.log('📊 Received validation data:', data.validation);
                setState(prev => ({
                  ...prev,
                  validation: ensureValidValidation(data.validation),
                  progress: 90,
                  currentStep: 'Validating code...',
                }));
                // Don't auto-show code quality panel - user can toggle manually if needed
              }

              if (data.projectId) {
                setCurrentProjectId(data.projectId);
                if (!projectName) {
                  setProjectName(generateSmartProjectName(prompt));
                }
                // Check if this is a multi-file project
                if (data.isMultiFile) {
                  setIsMultiFileProject(true);
                  setFilesCount(data.filesCount || 0);
                  console.log('📦 Multi-file project detected:', data.filesCount, 'files');
                  
                  // Fetch full project data to get files + update preview HTML
                  if (data.projectId) {
                    fetch(`/api/projects/${data.projectId}`)
                      .then(res => res.json())
                      .then(projectData => {
                        if (projectData.project?.files) {
                          setProjectFiles(projectData.project.files);
                          setProjectType(projectData.project.projectType || 'fullstack');
                          setProjectDependencies(
                            typeof projectData.project.dependencies === 'string'
                              ? JSON.parse(projectData.project.dependencies)
                              : projectData.project.dependencies || {}
                          );
                        }
                        // Update preview HTML with the server-generated content
                        // (replaces the garbage from parsing raw JSON during streaming)
                        if (projectData.project?.code) {
                          const { html, css, js } = parseCode(projectData.project.code);
                          setState(prev => ({ ...prev, html, css, js, fullCode: projectData.project.code }));
                        }
                      })
                      .catch(err => console.error('Failed to fetch project files:', err));
                  }
                }
                // Check if multi-page HTML pages were created
                if (data.isMultiPage) {
                  fetchProjectPages(data.projectId);
                }
              }

              if (data.done && pendingNewPageName && currentProjectId && state.html) {
                const slug = pendingNewPageName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                fetch(`/api/projects/${currentProjectId}/pages`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: pendingNewPageName,
                    slug,
                    content: state.html,
                    isHomepage: false,
                  }),
                })
                  .then(() => fetchProjectPages(currentProjectId))
                  .catch(err => console.error('Failed to save new page:', err));
                setPendingNewPageName(null);
              }

              if (data.error) {
                console.error('❌ Generation error:', data.error);
                toast.error(data.error);
                setState(prev => ({ 
                  ...prev, 
                  isGenerating: false, 
                  progress: 0, 
                  currentStep: data.canRetry ? 'Click "Fix & Regenerate" to try again' : 'Error occurred'
                }));
                
                // If it's a retry-able error, show regenerate option
                if (data.canRetry) {
                  setTimeout(() => {
                    toast('Tip: Try simplifying your prompt or click "Fix & Regenerate"');
                  }, 1000);
                }
                return;
              }

              if (data.done) {
                // Final parse with full accumulated code
                if (accumulatedCode) {
                  const { html, css, js } = parseCode(accumulatedCode);
                  setState(prev => ({ ...prev, html, css, js, fullCode: accumulatedCode }));
                }

                setState(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
                toast.success('Generation complete!');

                // Auto-save if projectId was returned from backend
                if (data.projectId && !currentProjectId) {
                  setCurrentProjectId(data.projectId);
                  console.log('✅ Project auto-saved with ID:', data.projectId);
                }

                setTimeout(() => {
                  setState(prev => ({ ...prev, progress: 0, currentStep: '' }));
                }, 2000);
              }

              if (data.error) {
                toast.error(data.error);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate. Please try again.';
      toast.error(errorMessage);
      setState(prev => ({ ...prev, progress: 0, currentStep: '' }));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [prompt, currentProjectId, projectName, generationMode, fetchProjectPages, pendingNewPageName, state.html]);

  // Regenerate & Fix function - Uses validation feedback loop with API
  const handleRegenerateFix = useCallback(async () => {
    if (!state.validation) {
      toast.error('No validation data available');
      return;
    }

    // Extract error messages for API feedback loop
    const errorMessages = [
      ...state.validation.errors.map(e => e.message),
      ...state.validation.warnings.map(w => w.message)
    ];

    if (errorMessages.length === 0) {
      toast('No issues to fix');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      html: '', 
      css: '', 
      js: '', 
      fullCode: '', 
      progress: 0, 
      currentStep: 'Regenerating with validation feedback...' 
    }));

    toast.loading('Regenerating with auto-fix for validation errors...');

    try {
      const requestBody: { 
        prompt: string; 
        projectId?: string;
        previousErrors: string[];
      } = { 
        prompt,
        previousErrors: errorMessages
      };
      
      if (currentProjectId && currentProjectId.trim()) {
        requestBody.projectId = currentProjectId;
      }
      
      const response = await fetch('/api/chatbot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Regeneration failed (${response.status})`;
        throw new Error(errorMessage);
      }

      setState(prev => ({ ...prev, progress: 10, currentStep: 'Connected to AI...' }));

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.code) {
                accumulatedCode += data.code;
                chunkCount++;

                const progress = Math.min(80, 10 + (chunkCount * 0.5));
                setState(prev => ({ ...prev, progress, currentStep: 'Fixing issues...' }));

                // Throttle parsing: only parse every 10 chunks and when content looks parseable
                const shouldParse = chunkCount % 10 === 0 || accumulatedCode.length < 200;
                const hasParseable = accumulatedCode.includes('<') || accumulatedCode.trim().startsWith('{');

                if (shouldParse && hasParseable) {
                  const { html, css, js } = parseCode(accumulatedCode);
                  setState(prev => ({ ...prev, html, css, js, fullCode: accumulatedCode }));
                } else {
                  setState(prev => ({ ...prev, fullCode: accumulatedCode }));
                }
              }

              if (data.validation) {
                setState(prev => ({
                  ...prev,
                  validation: ensureValidValidation(data.validation),
                  progress: 90,
                  currentStep: 'Validating fixes...',
                }));
                // Don't auto-show code quality panel - user can toggle manually if needed
              }

              if (data.done) {
                // Final parse with full accumulated code
                if (accumulatedCode) {
                  const { html, css, js } = parseCode(accumulatedCode);
                  setState(prev => ({ ...prev, html, css, js, fullCode: accumulatedCode }));
                }

                setState(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
                toast.dismiss();
                toast.success('Code regenerated with validation fixes!');

                setTimeout(() => {
                  setState(prev => ({ ...prev, progress: 0, currentStep: '' }));
                }, 2000);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.dismiss();
      toast.error('Failed to regenerate with fixes');
      setState(prev => ({ ...prev, progress: 0, currentStep: '' }));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [prompt, state.validation, currentProjectId]);

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const enhancedPrompt = `${prompt}\n\nBased on this file content:\n${content.slice(0, 2000)}...`;
      setPrompt(enhancedPrompt);
      toast.success(`File "${file.name}" uploaded and added to prompt`);
    };
    
    reader.readAsText(file);
  }, [prompt]);

  // Website parsing handler
  const handleParseWebsite = useCallback(async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    toast.loading('Parsing website...');
    
    try {
      // Note: You'll need to create this API endpoint
      const enhancedPrompt = `Create an app inspired by ${websiteUrl}\n\n${prompt}`;
      setPrompt(enhancedPrompt);
      toast.dismiss();
      toast.success('Website URL added to prompt');
      setWebsiteUrl('');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to parse website');
      console.error('Website parse error:', error);
    }
  }, [websiteUrl, prompt]);

  // Prompt template handler
  const handlePromptTemplate = useCallback((template: string) => {
    setPrompt(template);
    setShowPromptGuide(false);
    toast.success('Template applied!');
  }, []);

  // Template selection handler for PromptTemplates component
  const handleTemplateSelect = useCallback((templatePrompt: string) => {
    setPrompt(templatePrompt);
    toast.success('Template loaded! Click Generate to create your app.');
  }, []);

  // Other handlers remain the same...
  const handleRegenerateWithFixes = useCallback(() => {
    if (!state.validation) {
      toast.error('No validation errors to fix');
      return;
    }

    // Build a comprehensive list of issues
    const errors = state.validation.errors.map(e => 
      typeof e === 'string' ? e : e.message
    );
    const warnings = state.validation.warnings.map(w => 
      typeof w === 'string' ? w : w.message
    );
    const cspIssues = state.validation.cspViolations || [];

    const allIssues = [...errors, ...warnings, ...cspIssues];
    
    if (allIssues.length === 0) {
      toast('No issues detected');
      return;
    }

    // Create detailed fix instructions
    const issuesList = allIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');

    const improvedPrompt = `${prompt}

CRITICAL FIXES REQUIRED from previous generation:
${issuesList}

MANDATORY REQUIREMENTS:
- Add exactly ONE <h1> tag with the main page title
- Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Use ONLY Tailwind CSS classes (NO inline styles)
- Use addEventListener for events (NO inline event handlers like onclick)
- Use textContent instead of innerHTML for dynamic content
- Add charset meta tag: <meta charset="UTF-8">
- Use proper semantic HTML5 elements
- All CSS must use CSS variables for maintainability

Generate complete, production-ready code that fixes ALL issues above.`;

    setPrompt(improvedPrompt);
    
    // Small delay to ensure prompt is updated, then trigger generation
    setTimeout(() => {
      handleGenerate();
    }, 100);
  }, [state.validation, prompt, handleGenerate]);

  const handleSave = useCallback(async () => {
    if (!state.fullCode) {
      toast.error('No code to save');
      return;
    }

    // Auto-generate project name if empty
    const finalProjectName = projectName.trim() || prompt.slice(0, 50) || 'Untitled Project';
    if (!projectName.trim()) {
      setProjectName(finalProjectName);
    }

    setSaving(true);

    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentProjectId || undefined, // Allow creating new project
          name: finalProjectName,
          code: state.fullCode,
          validation: state.validation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || errorData.details?.[0] || 'Save failed');
      }

      const data = await response.json();
      setCurrentProjectId(data.id);
      toast.success('Project saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [state.fullCode, state.validation, projectName, currentProjectId, prompt]);

  const handleAssetSelected = (url: string) => {
    setAttachedImageUrls(prev => [...prev, url]);
    setPrompt(prev => `${prev}${prev ? '\n' : ''}Use this image: ${url}`);
    setShowMediaLibrary(false);
  };

  const handleDownload = useCallback(async () => {
    if (!state.fullCode && !isMultiFileProject) {
      toast.error('No code to download');
      return;
    }

    // Handle multi-file project downloads
    if (isMultiFileProject && currentProjectId) {
      try {
        toast.loading('Preparing download...');
        
        // Fetch project data if not already loaded
        let files = projectFiles;
        if (files.length === 0) {
          const response = await fetch(`/api/projects/${currentProjectId}`);
          const data = await response.json();
          files = data.project.files || [];
        }

        // Generate README content
        const readmeContent = generateReadme(
          projectName || 'My Project',
          projectType,
          projectDependencies
        );

        // Add README to files
        const allFiles = [
          ...files,
          { path: 'README.md', content: readmeContent, language: 'markdown' }
        ];

        // Create zip file
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        allFiles.forEach(file => {
          zip.file(file.path, file.content);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName || 'project'}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.dismiss();
        toast.success('Project downloaded with README!');
      } catch (error) {
        toast.dismiss();
        console.error('Download error:', error);
        toast.error('Failed to download project');
      }
      return;
    }

    // Handle single HTML file download
    const blob = new Blob([state.fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [state.fullCode, projectName, isMultiFileProject, currentProjectId, projectFiles, projectType, projectDependencies]);

  const handleCopy = useCallback(() => {
    if (!state.fullCode) {
      toast.error('No code to copy');
      return;
    }

    navigator.clipboard.writeText(state.fullCode);
    toast.success('Code copied to clipboard!');
  }, [state.fullCode]);

  const handlePublishVercel = useCallback(async () => {
    if (!currentProjectId) {
      toast.error('Please save the project first');
      return;
    }

    toast.loading('Publishing to Vercel...');
    
    try {
      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProjectId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Vercel deploy failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.dismiss();
      toast.success('Published to Vercel!');
      window.open(data.url, '_blank');
    } catch (error) {
      toast.dismiss();
      console.error('Vercel deploy error:', error);
      toast.error('Failed to publish to Vercel');
    }
  }, [currentProjectId]);

  const handlePublishGitHub = useCallback(async () => {
    if (!currentProjectId) {
      toast.error('Please save the project first');
      return;
    }

    toast.loading('Publishing to GitHub...');
    
    try {
      const response = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProjectId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'GitHub deploy failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.dismiss();
      toast.success('Published to GitHub!');
      window.open(data.url, '_blank');
    } catch (error) {
      toast.dismiss();
      console.error('GitHub deploy error:', error);
      toast.error('Failed to publish to GitHub');
    }
  }, [currentProjectId]);

  const handlePublishBuildFlow = useCallback(async () => {
    if (!currentProjectId) {
      toast.error('Please save the project first');
      return;
    }

    toast.loading('Publishing to BuildFlow...');
    
    try {
      const response = await fetch('/api/deploy/buildflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProjectId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'BuildFlow deploy failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.dismiss();
      toast.success(`Published to BuildFlow! URL: ${data.slug}`);
      window.open(data.url, '_blank');
    } catch (error) {
      toast.dismiss();
      console.error('BuildFlow deploy error:', error);
      toast.error('Failed to publish to BuildFlow');
    }
  }, [currentProjectId]);

  const handleOpenPreview = useCallback(async () => {
    // If no projectId, save first
    if (!currentProjectId && state.fullCode) {
      toast.loading('Saving project...');
      await handleSave();
      toast.dismiss();
      // Wait a moment for state to update
      setTimeout(() => {
        if (currentProjectId) {
          window.open(`/preview/${currentProjectId}`, '_blank');
        }
      }, 500);
      return;
    }

    if (!currentProjectId) {
      toast.error('No project to preview');
      return;
    }

    window.open(`/preview/${currentProjectId}`, '_blank');
  }, [currentProjectId, state.fullCode, handleSave]);

  // Test markdown stripping (development only)
  const testMarkdownStripping = useCallback(() => {
    const testCode = `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test</title>
</head>
<body>
  <h1>Test with markdown fences</h1>
</body>
</html>
\`\`\``;

    console.log('🧪 MARKDOWN STRIPPING TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Original code (with fences):');
    console.log(testCode);
    console.log('');
    
    const cleaned = stripMarkdownCodeFences(testCode);
    
    console.log('✨ Cleaned code (fences removed):');
    console.log(cleaned);
    console.log('');
    console.log('📊 Results:');
    console.log(`  Original length: ${testCode.length}`);
    console.log(`  Cleaned length: ${cleaned.length}`);
    console.log(`  Characters removed: ${testCode.length - cleaned.length}`);
    console.log(`  Still has markdown: ${cleaned.includes('\`\`\`') ? '❌ YES (FAILED)' : '✅ NO (PASSED)'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (cleaned.includes('\`\`\`')) {
      toast.error('❌ Markdown stripping test FAILED - fences still present!');
    } else {
      toast.success('✅ Markdown stripping test PASSED!');
    }
  }, []);

  if (status === 'loading' || isLoadingProject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isLoadingProject ? 'Loading project...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="hidden sm:flex text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                ← Dashboard
              </button>
              
              <div className="hidden sm:block border-l border-gray-300 h-6"></div>
              
              <input
                type="text"
                value={projectName || ''}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="text-base sm:text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 flex-1 max-w-xs"
              />
            </div>

            {/* Code Quality Badge */}
            {state.validation && (
              <button
                onClick={() => setShowCodeQuality(!showCodeQuality)}
                className={`hidden md:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors ${
                  state.validation.validationPassed
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                {state.validation.validationPassed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="text-xs sm:text-sm font-medium">
                  Quality: {state.validation.validationScore}/100
                </span>
              </button>
            )}

            {/* Test Button (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={testMarkdownStripping}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-medium"
                title="Test markdown fence stripping (check console)"
              >
                🧪 Test Fences
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="lg:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => {
                router.push('/dashboard');
                setShowMobileMenu(false);
              }}
              className="w-full text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg"
            >
              ← Dashboard
            </button>
            
            {state.validation && (
              <button
                onClick={() => {
                  setShowCodeQuality(!showCodeQuality);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${
                  state.validation.validationPassed
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                {state.validation.validationPassed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  Code Quality: {state.validation.validationScore}/100
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {state.isGenerating && state.progress > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{state.currentStep}</span>
              <span className="text-sm font-semibold text-purple-600">{state.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Code Quality Panel */}
      {showCodeQuality && state.validation && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Code Quality Report</h3>
                
                {state.validation.errors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Errors ({state.validation.errors.length})
                    </h4>
                    <ul className="space-y-2">
                      {state.validation.errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          <span>{error.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {state.validation.cspViolations.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Security Issues ({state.validation.cspViolations.length})
                    </h4>
                    <ul className="space-y-2">
                      {state.validation.cspViolations.map((violation, i) => (
                        <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                          <span className="text-orange-500">•</span>
                          <span>{violation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {state.validation.warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings ({state.validation.warnings.length})
                    </h4>
                    <ul className="space-y-2">
                      {state.validation.warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                          <span className="text-yellow-500">•</span>
                          <span>{warning.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {state.validation.errors.length === 0 && 
                 state.validation.warnings.length === 0 && 
                 state.validation.cspViolations.length === 0 && (
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    All validation checks passed! Great job!
                  </p>
                )}
              </div>

              {(state.validation.errors.length > 0 || state.validation.cspViolations.length > 0) && (
                <button
                  onClick={handleRegenerateWithFixes}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Fix & Regenerate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
          {/* Left Panel - Input */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Prompt Input */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Describe Your App</h2>
                <button
                  onClick={() => setShowPromptGuide(!showPromptGuide)}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="hidden sm:inline">Guide</span>
                </button>
              </div>

              {/* Quick Start Templates */}
              <div className="mb-4">
                <PromptTemplates onSelect={handleTemplateSelect} />
              </div>

              {/* Prompt Guide */}
              {showPromptGuide && (
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-purple-900 mb-3">💡 Prompt Templates</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-purple-700 mb-1">Simple Example:</p>
                      <button
                        onClick={() => handlePromptTemplate(PROMPT_TEMPLATES.simple)}
                        className="w-full text-left text-xs text-gray-700 bg-white p-2 rounded border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                      >
                        {PROMPT_TEMPLATES.simple}
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-purple-700 mb-1">Complex Example:</p>
                      <button
                        onClick={() => handlePromptTemplate(PROMPT_TEMPLATES.complex)}
                        className="w-full text-left text-xs text-gray-700 bg-white p-2 rounded border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                      >
                        {PROMPT_TEMPLATES.complex}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-purple-600 mt-3">
                    ✨ Tip: Be specific about pages, features, and design style for best results!
                  </p>
                </div>
              )}
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a modern CRM dashboard with contacts, deals, and analytics pages..."
                className="w-full h-32 sm:h-40 p-3 sm:p-4 text-sm sm:text-base text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={state.isGenerating}
              />

              {/* Attached image chips */}
              {attachedImageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachedImageUrls.map((url, i) => (
                    <div key={url} className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 border border-purple-200 rounded-lg text-xs text-purple-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-4 h-4 object-cover rounded" />
                      <span>Image {i + 1}</span>
                      <button
                        onClick={() => {
                          setAttachedImageUrls(prev => prev.filter(u => u !== url));
                          setPrompt(prev => prev.replace(`\nUse this image: ${url}`, '').replace(`Use this image: ${url}`, '').trim());
                        }}
                        className="ml-0.5 text-purple-500 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Generation Mode Toggle */}
              {(currentProjectId || state.fullCode) && (
                <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Generation Mode</h4>
                      <p className="text-xs text-gray-600">Choose how to generate your code</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setGenerationMode('iterate')}
                      className={`px-4 py-3 rounded-lg transition-all font-medium shadow-sm ${
                        generationMode === 'iterate'
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="text-xl mb-1">🔄</div>
                      <div className="font-bold text-sm">Add to Existing</div>
                      <div className="text-xs opacity-80 mt-1">Preserve current code</div>
                    </button>
                    <button
                      onClick={() => setGenerationMode('fresh')}
                      className={`px-4 py-3 rounded-lg transition-all font-medium shadow-sm ${
                        generationMode === 'fresh'
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="text-xl mb-1">✨</div>
                      <div className="font-bold text-sm">Start Fresh</div>
                      <div className="text-xs opacity-80 mt-1">Generate from scratch</div>
                    </button>
                  </div>
                  <div className="mt-3 p-2 bg-white/60 rounded text-sm text-gray-700">
                    {generationMode === 'iterate' 
                      ? '💡 Will add features to your existing code without losing what you have'
                      : '💡 Will create a completely new project, ignoring previous code'}
                  </div>
                </div>
              )}

              {/* Upload & Parse Section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-3">Enhance your prompt:</p>
                <div className="grid grid-cols-3 gap-2">
                  {/* File Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="*/*"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-2 py-2 rounded-lg border border-gray-300 transition-colors text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Upload File</span>
                    </button>
                  </div>

                  {/* Website Parse */}
                  <div className="relative">
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="Website URL"
                      className="w-full px-2 py-2 pr-8 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleParseWebsite}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700"
                      title="Add website to prompt"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Media Library */}
                  <button
                    onClick={() => setShowMediaLibrary(true)}
                    className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-2 py-2 rounded-lg border border-gray-300 transition-colors text-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Images</span>
                  </button>
                </div>
                
                {uploadedFile && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    File uploaded: {uploadedFile.name}
                  </p>
                )}
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={state.isGenerating || !prompt.trim()}
                className="mt-4 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 sm:px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {state.isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-sm sm:text-base">Generating...</span>
                  </>
                ) : state.fullCode ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span className="text-sm sm:text-base">Regenerate with Changes</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm sm:text-base">Generate App</span>
                  </>
                )}
              </button>
            </div>

            {/* Actions - Only show when code is generated */}
            {state.fullCode && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Actions</h2>
                
                {isMultiFileProject && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Multi-file project detected!</strong> This project was automatically saved with {currentProjectId ? 'all files stored in the database' : 'multiple files'}.
                    </p>
                    {/* Live / Static preview toggle */}
                    <button
                      onClick={() => {
                        setUseWebContainer(v => !v);
                        if (webContainerFailed) setWebContainerFailed(false);
                      }}
                      className="mt-2 text-xs px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {useWebContainer && !webContainerFailed ? 'Switch to Static Preview' : 'Switch to Live Preview'}
                    </button>
                  </div>
                )}
                
                {projectPages.length > 0 && (
                  <button
                    onClick={() => { setNewPageNameInput(''); setShowAddPageModal(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm mb-3"
                  >
                    <span>+</span> Add Page
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || isMultiFileProject}
                    title={isMultiFileProject ? 'Multi-file projects are auto-saved' : 'Save project'}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <Save className="w-4 h-4" />
                    {isMultiFileProject ? 'Auto-saved' : saving ? 'Saving...' : 'Save'}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>

                  <button
                    onClick={() => setShowViewCode(!showViewCode)}
                    className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                  >
                    <Code2 className="w-4 h-4" />
                    View Code
                  </button>

                  <button
                    onClick={handleOpenPreview}
                    disabled={!state.fullCode}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {!currentProjectId ? 'Save & Preview' : 'Preview'}
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Publish</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={handlePublishBuildFlow}
                      disabled={!currentProjectId}
                      className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                      <Sparkles className="w-4 h-4" />
                      BuildFlow
                    </button>

                    <button
                      onClick={handlePublishGitHub}
                      disabled={!currentProjectId}
                      className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </button>

                    <button
                      onClick={handlePublishVercel}
                      disabled={!currentProjectId}
                      className="flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 76 65" fill="currentColor">
                        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                      </svg>
                      Vercel
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={state.isGenerating}
                  className="mt-4 w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm sm:text-base"
                  title="Regenerate using the current prompt text (modify prompt above to add changes)"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate from Prompt
                </button>
                
                {/* Iteration Helper Text */}
                <p className="mt-2 text-xs text-gray-600 text-center">
                  💡 Tip: Edit your prompt above to add features or make changes, then regenerate
                </p>

                {/* Regenerate & Fix Button - Only show if there are validation issues */}
                {state.validation && !state.validation.validationPassed && (
                  <button
                    onClick={handleRegenerateFix}
                    disabled={state.isGenerating}
                    className="mt-3 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm sm:text-base shadow-md"
                  >
                    <Wand2 className="w-4 h-4" />
                    Regenerate & Fix Issues
                  </button>
                )}
              </div>
            )}

            {/* Multi-File Project Setup Instructions */}
            {isMultiFileProject && state.fullCode && (
              <MultiFileProjectSetup
                projectName={projectName || 'My Project'}
                filesCount={filesCount}
                projectType={projectType || 'fullstack'}
                dependencies={projectDependencies}
                onDownload={handleDownload}
                onViewCode={() => setShowCodeViewer(true)}
                onDeploy={handlePublishVercel}
              />
            )}


            {/* View / Edit Code Modal — Monaco Editor */}
            {showViewCode && state.fullCode && (
              <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: '88vh' }}>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Code2 className="w-5 h-5 text-purple-400" />
                      <h3 className="text-base font-semibold text-white">Code Editor</h3>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">HTML · editable</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const changed = editableCode && editableCode !== state.fullCode;
                          if (changed) {
                            const parsed = parseGeneratedCode(editableCode);
                            setState(prev => ({
                              ...prev,
                              html: parsed.html || editableCode,
                              css: parsed.css || '',
                              js: parsed.javascript || '',
                              fullCode: editableCode,
                            }));
                            toast.success('Code changes applied to preview');
                          }
                          setShowViewCode(false);
                        }}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                      >
                        <Save className="w-4 h-4" />
                        {editableCode && editableCode !== state.fullCode ? 'Apply & Close' : 'Close'}
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={() => setShowViewCode(false)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {/* Monaco */}
                  <div className="flex-1 overflow-hidden rounded-b-xl">
                    <MonacoCodeEditor
                      value={editableCode || state.fullCode}
                      onChange={setEditableCode}
                      language="html"
                      height="100%"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex flex-col min-h-[400px] lg:min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden relative">
              <ErrorBoundary>
                {/* Branch 1: Multi-file fullstack → WebContainer live preview */}
                {isMultiFileProject && projectFiles.length > 0 && useWebContainer && !webContainerFailed ? (
                  <WebContainerPreview
                    files={projectFiles}
                    dependencies={projectDependencies}
                    projectType={projectType}
                    onFallback={() => setWebContainerFailed(true)}
                  />
                ) : /* Branch 2: Multi-page HTML → tabbed preview */
                projectPages.length > 0 ? (
                  <PreviewFrameMultiPage pages={projectPages} />
                ) : /* Branch 3: Single HTML → standard preview */
                (
                  <PreviewFrame
                    html={state.html}
                    css={state.css}
                    js={state.js}
                    validation={state.validation || undefined}
                    onElementClick={(info) => {
                      const suggestion = `Edit the ${info.tag}${info.classes ? ` with class "${info.classes.split(' ').filter(Boolean).slice(0, 3).join(' ')}"` : ''}${info.text ? ` that says "${info.text.slice(0, 60)}"` : ''}: `;
                      setPrompt(suggestion);
                      setTimeout(() => {
                        const ta = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="prompt" i], textarea[placeholder*="describe" i], textarea[placeholder*="build" i]');
                        ta?.focus();
                        ta?.setSelectionRange(suggestion.length, suggestion.length);
                      }, 50);
                    }}
                  />
                )}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>

      {/* Add Page Modal */}
      {showAddPageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add a New Page</h3>
              <button onClick={() => setShowAddPageModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Enter a page name and we&apos;ll generate it consistently with your existing design.
            </p>
            <input
              type="text"
              value={newPageNameInput}
              onChange={e => setNewPageNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newPageNameInput.trim()) {
                  const name = newPageNameInput.trim();
                  setShowAddPageModal(false);
                  setPendingNewPageName(name);
                  setPrompt(`Create a "${name}" page for this website. Make it visually consistent with the existing pages — same header, footer, navigation, color scheme, fonts, and design system. The page should have appropriate content for a "${name}" section.`);
                  setTimeout(() => handleGenerate(), 100);
                }
              }}
              placeholder="e.g. About, Services, Contact, Blog…"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4 text-sm"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPageModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!newPageNameInput.trim()}
                onClick={() => {
                  const name = newPageNameInput.trim();
                  if (!name) return;
                  setShowAddPageModal(false);
                  setPendingNewPageName(name);
                  setPrompt(`Create a "${name}" page for this website. Make it visually consistent with the existing pages — same header, footer, navigation, color scheme, fonts, and design system. The page should have appropriate content for a "${name}" section.`);
                  setTimeout(() => handleGenerate(), 100);
                }}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelectAsset={handleAssetSelected}
      />

      {/* Code File Viewer Modal */}
      {showCodeViewer && projectFiles.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Project Files</h3>
              <button
                onClick={() => setShowCodeViewer(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeFileViewer
                files={projectFiles}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatBuilder() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-400">Loading...</div>}>
      <ChatBuilderContent />
    </Suspense>
  );
}

// Helper Functions
function parseCode(fullCode: string): { html: string; css: string; js: string } {
  // Strip markdown code fences first using utility function
  const cleanedCode = stripMarkdownCodeFences(fullCode);

  // Check if this is a multi-file project (JSON format)
  const trimmedCode = cleanedCode.trim();
  if (trimmedCode.startsWith('{') || trimmedCode.startsWith('[')) {
    try {
      const parseResult = parseMultiFileProject(cleanedCode);
      if (parseResult.success && parseResult.project) {
        console.log('✅ Parsed multi-file project:', parseResult.project.projectName);
        const previewHtml = convertToSingleHTML(parseResult.project);
        return { html: previewHtml, css: '', js: '' };
      }
      // Incomplete JSON during streaming — return empty, will re-parse when done
    } catch {
      // Incomplete JSON during streaming — return empty, will re-parse when done
    }
    return { html: '', css: '', js: '' };
  }

  // Check if we actually have HTML content
  if (!cleanedCode.includes('<') || !cleanedCode.includes('>')) {
    // Try to extract HTML from markdown code blocks
    const htmlBlockMatch = cleanedCode.match(/```html\s*\n([\s\S]*?)\n```/);
    if (htmlBlockMatch) {
      return parseCode(htmlBlockMatch[1].trim());
    }
    // No HTML found — return empty (normal during early streaming)
    return { html: '', css: '', js: '' };
  }
  
  const html = cleanedCode;
  
  // Extract CSS
  const cssMatch = cleanedCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = cssMatch ? cssMatch[1].trim() : '';
  
  // Extract JavaScript - IMPROVED to skip malformed blocks
  const jsMatches = cleanedCode.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  const jsBlocks: string[] = [];
  
  for (const match of jsMatches) {
    const scriptContent = match[1].trim();
    
    // Skip empty scripts
    if (!scriptContent) continue;
    
    // Skip if it's malformed (contains actual HTML tags like <div>, <p>, etc.)
    // But allow < > in legitimate JS (comparisons, template literals)
    const hasHTMLTags = /<[a-zA-Z][a-zA-Z0-9]*[^>]*>/g.test(scriptContent.replace(/`[\s\S]*?`/g, '')); // Remove template literals first
    if (hasHTMLTags) {
      console.warn('⚠️ Skipping malformed script block containing HTML tags');
      continue;
    }
    
    jsBlocks.push(scriptContent);
  }
  
  const js = jsBlocks.join('\n\n');
  
  return { html, css, js };
}

function ensureValidValidation(validation: Partial<ValidationResult> | undefined): ValidationResult {
  return {
    isComplete: validation?.isComplete ?? true,
    hasHtml: validation?.hasHtml ?? true,
    hasCss: validation?.hasCss ?? false,
    hasJs: validation?.hasJs ?? false,
    validationScore: validation?.validationScore ?? 0,
    validationPassed: validation?.validationPassed ?? false,
    errors: validation?.errors ?? [],
    warnings: validation?.warnings ?? [],
    cspViolations: validation?.cspViolations ?? [],
    passed: validation?.passed ?? false,
  };
}
