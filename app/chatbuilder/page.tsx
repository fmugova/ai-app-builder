'use client';

import React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PreviewFrame from '@/components/PreviewFrame';
import { AlertTriangle, CheckCircle, XCircle, Download, Copy, Github, ExternalLink, Save, Sparkles, RefreshCw, Upload, Link as LinkIcon, Code2, Lightbulb, Menu, X } from 'lucide-react';

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

// Prompt Templates
const PROMPT_TEMPLATES = {
  simple: "Create a simple task manager app with a task list and add/delete functionality",
  complex: "Create a comprehensive CRM dashboard with contacts management, deal pipeline with drag-and-drop, analytics charts showing sales metrics, activity timeline, and settings page. Include search, filters, and data tables with pagination. Use modern design with sidebar navigation."
};

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

export default function ChatBuilder() {
  const { status } = useSession();
  const router = useRouter();

  // State
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showViewCode, setShowViewCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Generation function with progress tracking
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
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
      currentStep: 'Starting generation...' 
    }));
    
    try {
      const response = await fetch('/api/chatbot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          projectId: currentProjectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
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
                
                const { html, css, js } = parseCode(accumulatedCode);
                
                setState(prev => ({
                  ...prev,
                  html,
                  css,
                  js,
                  fullCode: accumulatedCode,
                }));
              }

              if (data.validation) {
                setState(prev => ({
                  ...prev,
                  validation: ensureValidValidation(data.validation),
                  progress: 90,
                  currentStep: 'Validating code...',
                }));
                setShowCodeQuality(true);
              }

              if (data.projectId) {
                setCurrentProjectId(data.projectId);
                if (!projectName) {
                  setProjectName(prompt.slice(0, 50));
                }
              }

              if (data.done) {
                setState(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
                toast.success('Generation complete!');
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
      toast.error('Failed to generate. Please try again.');
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [prompt, currentProjectId, projectName]);

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

  // Other handlers remain the same...
  const handleRegenerateWithFixes = useCallback(() => {
    if (!state.validation) return;

    const issues = [
      ...state.validation.errors.map(e => e.message),
      ...state.validation.cspViolations
    ].join(', ');

    const improvedPrompt = `${prompt}

IMPORTANT: Fix these issues from the previous generation:
${issues}

Ensure:
- NO inline styles (use Tailwind classes only)
- NO inline event handlers (use addEventListener)
- Proper semantic HTML
- Complete, functional code`;

    setPrompt(improvedPrompt);
    toast.success('Prompt updated with fixes. Click Generate to try again.');
  }, [prompt, state.validation]);

  const handleSave = useCallback(async () => {
    if (!state.fullCode) {
      toast.error('No code to save');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentProjectId,
          name: projectName,
          code: state.fullCode,
          validation: state.validation,
        }),
      });

      if (!response.ok) throw new Error('Save failed');

      const data = await response.json();
      setCurrentProjectId(data.id);
      toast.success('Project saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  }, [state.fullCode, state.validation, projectName, currentProjectId]);

  const handleDownload = useCallback(() => {
    if (!state.fullCode) {
      toast.error('No code to download');
      return;
    }

    const blob = new Blob([state.fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [state.fullCode, projectName]);

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

      if (!response.ok) throw new Error('Vercel deploy failed');

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

      if (!response.ok) throw new Error('GitHub deploy failed');

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

  const handleOpenPreview = useCallback(() => {
    if (!currentProjectId) {
      toast.error('Please save the project first');
      return;
    }

    window.open(`/preview/${currentProjectId}`, '_blank');
  }, [currentProjectId]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

              {/* Upload & Parse Section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-3">Enhance your prompt:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg border border-gray-300 transition-colors text-sm"
                    >
                      <Upload className="w-4 h-4" />
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
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleParseWebsite}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700"
                      title="Add website to prompt"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>
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
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
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
                    disabled={!currentProjectId}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Publish</h3>
                  <div className="grid grid-cols-2 gap-3">
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
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            )}

            {/* View Code Modal */}
            {showViewCode && state.fullCode && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Generated Code</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={() => setShowViewCode(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4 sm:p-6">
                    <pre className="text-xs sm:text-sm bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                      <code>{state.fullCode}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex flex-col min-h-[400px] lg:min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden relative">
              <ErrorBoundary>
                <PreviewFrame
                  html={state.html}
                  css={state.css}
                  js={state.js}
                  validation={state.validation || undefined}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Functions
function parseCode(fullCode: string): { html: string; css: string; js: string } {
  const html = fullCode;
  const cssMatch = fullCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = cssMatch ? cssMatch[1] : '';
  const jsMatches = fullCode.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  const js = Array.from(jsMatches).map(match => match[1]).join('\n\n');
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
