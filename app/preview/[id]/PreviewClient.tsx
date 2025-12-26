'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Edit, Share2, Code, RefreshCw, Trash2, X, Copy, Check, Rocket } from 'lucide-react';
import SimpleExportButton from '@/components/SimpleExportButton';
import DeployButton from '@/components/DeployButton';
import { sanitizeCode, isReactCode } from '@/lib/sanitizeCode';

interface PreviewClientProps {
  projectId: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  type?: string;
}

export default function PreviewClient({ projectId }: PreviewClientProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch project');
        }

        const data = await response.json();

        // Don't sanitize React code - it needs all its scripts
        const codeToRender = isReactCode(data.code) 
          ? data.code 
          : sanitizeCode(data.code);

        setProject({
          ...data,
          code: codeToRender
        });

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleDownload = () => {
    if (project?.code) {
      const blob = new Blob([project.code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'project'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = async () => {
    if (project?.code) {
      await navigator.clipboard.writeText(project.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = () => {
    router.push(`/builder?project=${projectId}`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Project deleted');
        router.push('/dashboard');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleExportGitHub = () => {
    setShowExportModal(true);
  };

  const handleDeploy = () => {
    setShowDeployModal(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !project.code) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md text-center">
          <h2 className="text-red-500 text-xl font-bold mb-2">Preview Error</h2>
          <p className="text-gray-300">{error || 'Project not found'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // CRITICAL: Don't validate or parse the code
  // Claude generates complete, valid HTML - just render it
  
  return (
    <div className="w-full h-screen flex flex-col bg-gray-950">
      {/* Header with Controls */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-semibold text-lg truncate">
            {project?.name || 'Preview'}
          </h1>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Edit project"
          >
            <Edit className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Edit</span>
          </button>

          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="View code"
          >
            <Code className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Code</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                <span className="hidden sm:inline text-sm text-green-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Download as HTML"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Download</span>
          </button>

          <button
            onClick={handleExportGitHub}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Export Project"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Export</span>
          </button>

          <button
            onClick={handleDeploy}
            className="flex items-center gap-2 p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded-lg transition"
            title="Deploy to Vercel"
          >
            <Rocket className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Deploy</span>
          </button>

          <div className="w-px h-6 bg-gray-700"></div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition"
            title="Delete project"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Pane */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-950">
          {project?.code ? (
            <div className="w-full h-full max-w-6xl">
              <iframe
                srcDoc={project.code}
                className="w-full h-full border-0 rounded-lg shadow-lg"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                title="Project Preview"
              />
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-4">No preview available</p>
            </div>
          )}
        </div>

        {/* Code Viewer Pane */}
        {showCode && project?.code && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 overflow-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Code</h3>
              <button
                onClick={() => setShowCode(false)}
                className="p-1 hover:bg-gray-800 rounded transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <pre className="text-xs text-gray-300 overflow-x-auto font-mono">
                <code>{project.code}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Export Project</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-gray-800 rounded transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <SimpleExportButton 
              projectId={projectId} 
              projectName={project?.name || 'Project'}
              projectCode={project?.code || ''}
              projectType={project?.type || 'html'}
              onSuccess={() => setShowExportModal(false)}
            />
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Deploy to Vercel</h2>
              <button
                onClick={() => setShowDeployModal(false)}
                className="p-1 hover:bg-gray-800 rounded transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <DeployButton 
              projectId={projectId} 
              projectName={project?.name || 'Project'}
            />
          </div>
        </div>
      )}
    </div>
  );
}