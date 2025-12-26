'use client';

import { useState } from 'react';
import { 
  Eye, 
  Code, 
  Download, 
  Copy, 
  Trash2, 
  Globe,
  GlobeLock,
  ExternalLink,
  Github,
  Share2,
  Rocket,
  MoreVertical,
  Edit3,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ShareModal from './ShareModal';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    type: string;
    isPublished: boolean;
    publicUrl: string | null;
    views: number;
    createdAt: Date;
    updatedAt: Date;
  };
  onDelete?: () => void;
  onRefresh?: () => void;
}

export default function ProjectCard({ project, onDelete, onRefresh }: ProjectCardProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deployingVercel, setDeployingVercel] = useState(false);

  // BuildFlow Hosting - Simple publish
  const handlePublishToBuildFlow = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('🎉 Published to BuildFlow!');
        setShareModalOpen(true);
        onRefresh?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to publish');
      }
    } catch (error) {
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  // Vercel Deployment - Requires GitHub first
  const handleDeployToVercel = async () => {
    setDeployingVercel(true);
    
    try {
      // Step 1: Check if project is on GitHub
      const githubCheck = await fetch(`/api/projects/${project.id}/github-status`);
      const githubData = await githubCheck.json();
      
      if (!githubData.hasGithubRepo) {
        // No GitHub repo - export first!
        const confirmExport = confirm(
          '⚠️ Vercel requires GitHub.\n\nYour project will be:\n1. Exported to GitHub\n2. Deployed to Vercel\n\nContinue?'
        );
        
        if (!confirmExport) {
          setDeployingVercel(false);
          return;
        }
        
        // Export to GitHub first
        toast.loading('Step 1/2: Exporting to GitHub...', { id: 'deploy-vercel' });
        
        const exportRes = await fetch(`/api/export/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id })
        });
        
        if (!exportRes.ok) {
          toast.error('GitHub export failed', { id: 'deploy-vercel' });
          setDeployingVercel(false);
          return;
        }
        
        const exportData = await exportRes.json();
        toast.success('✅ Exported to GitHub!', { id: 'deploy-vercel' });
        
        // Now deploy to Vercel
        await deployToVercel(exportData.repoName);
      } else {
        // Already on GitHub - deploy directly
        toast.loading('Deploying to Vercel...', { id: 'deploy-vercel' });
        await deployToVercel(githubData.repoName);
      }
    } catch (error) {
      toast.error('Deployment failed', { id: 'deploy-vercel' });
      setDeployingVercel(false);
    }
  };

  const deployToVercel = async (repoName: string) => {
    try {
      toast.loading('Step 2/2: Deploying to Vercel...', { id: 'deploy-vercel' });
      
      const res = await fetch(`/api/deploy/vercel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          githubRepoName: repoName
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('🚀 Deployed to Vercel!', { id: 'deploy-vercel' });
        window.open(data.deploymentUrl, '_blank');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Deployment failed', { id: 'deploy-vercel' });
      }
    } catch (error) {
      toast.error('Deployment failed', { id: 'deploy-vercel' });
    } finally {
      setDeployingVercel(false);
    }
  };

  const handleExport = async (type: 'github' | 'zip') => {
    try {
      if (type === 'github') {
        const res = await fetch(`/api/export/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id })
        });
        
        if (res.ok) {
          const data = await res.json();
          toast.success('✅ Exported to GitHub!');
          window.open(data.repoUrl, '_blank');
        } else {
          toast.error('GitHub export failed');
        }
      } else {
        const res = await fetch(`/api/projects/${project.id}/download`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}.zip`;
        a.click();
        toast.success('📦 Downloaded!');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <>
      <div className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md">
        {/* Gradient Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Card Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {project.name}
                </h3>
                {project.isPublished ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium whitespace-nowrap">
                    <Globe className="w-3 h-3" />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium whitespace-nowrap">
                    <GlobeLock className="w-3 h-3" />
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {project.description || 'No description provided'}
              </p>
            </div>

            {/* More Menu */}
            <div className="relative ml-2">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="More options"
                type="button"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>

              {menuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <button
                      onClick={() => {
                        window.open(`/builder?project=${project.id}`, '_self');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                      type="button"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Project
                    </button>
                    <button
                      onClick={() => {
                        handleExport('github');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                      type="button"
                    >
                      <Github className="w-4 h-4" />
                      Export to GitHub
                    </button>
                    <button
                      onClick={() => {
                        handleExport('zip');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                      type="button"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => {
                        onDelete?.();
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 transition"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          {project.isPublished && (
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{project.views} views</span>
              </div>
              <div>
                Published {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => window.open(`/preview/${project.id}`, '_blank')}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-sm font-medium"
              title="Preview project"
              type="button"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <button
              onClick={() => window.open(`/builder?project=${project.id}`, '_self')}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition text-sm font-medium"
              title="Edit project code"
              type="button"
            >
              <Code className="w-4 h-4" />
              Code
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(project.publicUrl || '');
                toast.success('URL copied!');
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition text-sm font-medium"
              title="Copy project URL"
              type="button"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>

          {/* DISTINCT DEPLOYMENT BUTTONS */}
          <div className="space-y-2">
            {/* BuildFlow Hosting - Always Available */}
            {!project.isPublished ? (
              <button
                onClick={handlePublishToBuildFlow}
                disabled={publishing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Publish to BuildFlow hosting (instant)"
                type="button"
              >
                <Zap className="w-4 h-4" />
                {publishing ? 'Publishing...' : 'Publish to BuildFlow'}
              </button>
            ) : (
              <button
                onClick={() => setShareModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-semibold shadow-sm"
                title="Share your published site"
                type="button"
              >
                <Share2 className="w-4 h-4" />
                Share BuildFlow Site
              </button>
            )}

            {/* Vercel Deployment - Separate, Distinct Button */}
            <button
              onClick={handleDeployToVercel}
              disabled={deployingVercel}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-900 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
              title="Deploy to Vercel (requires GitHub)"
              type="button"
            >
              {deployingVercel ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deploying to Vercel...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 76 76" className="w-4 h-4" fill="white">
                    <path d="M38 0L76 76H0L38 0z" />
                  </svg>
                  Deploy to Vercel
                </>
              )}
            </button>
          </div>

          {/* Helpful Info */}
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-500" />
              <span>BuildFlow: Instant hosting on our domain</span>
            </div>
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 76 76" className="w-3 h-3" fill="currentColor">
                <path d="M38 0L76 76H0L38 0z" />
              </svg>
              <span>Vercel: Custom domains & advanced features</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {project.isPublished && project.publicUrl && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectName={project.name}
          publicUrl={project.publicUrl}
          views={project.views}
        />
      )}
    </>
  );
}