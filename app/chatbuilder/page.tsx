'use client';

import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PreviewFrame from '@/components/PreviewFrame';
import { AlertTriangle, CheckCircle, XCircle, Download, Copy, Github, ExternalLink, Save, Sparkles, RefreshCw } from 'lucide-react';

// ============================================
// TYPES
// ============================================

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
}

// ============================================
// ERROR BOUNDARY
// ============================================

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

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChatBuilder() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ============================================
  // STATE
  // ============================================

  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [state, setState] = useState<GenerationState>({
    html: '',
    css: '',
    js: '',
    fullCode: '',
    isGenerating: false,
    validation: null,
  });

  const [showCodeQuality, setShowCodeQuality] = useState(false);
  const [saving, setSaving] = useState(false);

  // ============================================
  // AUTH CHECK
  // ============================================

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // ============================================
  // GENERATION FUNCTION
  // ============================================

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true }));
    
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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';

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
                
                // Parse HTML, CSS, JS
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
                }));
              }

              if (data.projectId) {
                setCurrentProjectId(data.projectId);
              }

              if (data.done) {
                toast.success('Generation complete!');
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
  }, [prompt, currentProjectId]);

  // ============================================
  // REGENERATE WITH FIXES
  // ============================================

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

  // ============================================
  // SAVE FUNCTION
  // ============================================

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

  // ============================================
  // DOWNLOAD FUNCTION
  // ============================================

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

  // ============================================
  // COPY FUNCTION
  // ============================================

  const handleCopy = useCallback(() => {
    if (!state.fullCode) {
      toast.error('No code to copy');
      return;
    }

    navigator.clipboard.writeText(state.fullCode);
    toast.success('Code copied to clipboard!');
  }, [state.fullCode]);

  // ============================================
  // PUBLISH FUNCTIONS
  // ============================================

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
      toast.success('Published to Vercel!');
      window.open(data.url, '_blank');
    } catch (error) {
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
      toast.success('Published to GitHub!');
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('GitHub deploy error:', error);
      toast.error('Failed to publish to GitHub');
    }
  }, [currentProjectId]);

  // ============================================
  // OPEN PREVIEW
  // ============================================

  const handleOpenPreview = useCallback(() => {
    if (!currentProjectId) {
      toast.error('Please save the project first');
      return;
    }

    window.open(`/preview/${currentProjectId}`, '_blank');
  }, [currentProjectId]);

  // ============================================
  // RENDER
  // ============================================

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Dashboard
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <input
                type="text"
                value={projectName || ''}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="text-lg font-semibold border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2"
              />
            </div>

            {/* Code Quality Badge */}
            {state.validation && (
              <button
                onClick={() => setShowCodeQuality(!showCodeQuality)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
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
                <span className="text-sm font-medium">
                  Code Quality: {state.validation.validationScore}/100
                </span>
                {state.validation.errors.length > 0 && (
                  <span className="text-xs">• {state.validation.errors.length} issues</span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Code Quality Panel */}
      {showCodeQuality && state.validation && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-3">Code Quality Report</h3>
                
                {/* Errors */}
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

                {/* CSP Violations */}
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

                {/* Warnings */}
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

                {/* No Issues */}
                {state.validation.errors.length === 0 && 
                 state.validation.warnings.length === 0 && 
                 state.validation.cspViolations.length === 0 && (
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    All validation checks passed! Great job!
                  </p>
                )}
              </div>

              {/* Regenerate Button */}
              {(state.validation.errors.length > 0 || state.validation.cspViolations.length > 0) && (
                <button
                  onClick={handleRegenerateWithFixes}
                  className="ml-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
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
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Panel - Input */}
          <div className="flex flex-col gap-6">
            {/* Prompt Input */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Describe Your App</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a modern CRM dashboard with contacts, deals, and analytics pages..."
                className="w-full h-40 p-4 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={state.isGenerating}
              />
              
              <button
                onClick={handleGenerate}
                disabled={state.isGenerating || !prompt.trim()}
                className="mt-4 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {state.isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate App
                  </>
                )}
              </button>
            </div>

            {/* Actions */}
            {state.fullCode && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Actions</h2>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>

                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </button>

                  <button
                    onClick={handleOpenPreview}
                    disabled={!currentProjectId}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Preview
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Publish</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handlePublishGitHub}
                      disabled={!currentProjectId}
                      className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </button>

                    <button
                      onClick={handlePublishVercel}
                      disabled={!currentProjectId}
                      className="flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
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
                  className="mt-4 w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border flex-1 overflow-hidden relative min-h-[600px]">
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

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseCode(fullCode: string): { html: string; css: string; js: string } {
  // Extract HTML (everything)
  const html = fullCode;

  // Extract CSS (from <style> tags)
  const cssMatch = fullCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = cssMatch ? cssMatch[1] : '';

  // Extract JS (from <script> tags)
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