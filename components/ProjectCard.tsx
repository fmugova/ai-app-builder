'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'react-hot-toast';
import ShareModal from './ShareModal';


interface Project {
  id: string;
  name: string;
  description?: string;
  type?: string;
  isPublished: boolean;
  publicUrl?: string | null;
  publicSlug?: string | null;
  views?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // ... other fields
}

interface ProjectCardProps {
  project: Project;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export default function ProjectCard({ project, onDelete, onRefresh }: ProjectCardProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deployingVercel, setDeployingVercel] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string | null>(null);

  // Lazy-load GitHub status to show badge if project was pushed
  useEffect(() => {
    fetch(`/api/projects/${project.id}/github-status`)
      .then(r => r.json())
      .then(d => { if (d.hasGithubRepo && d.deployment?.deploymentUrl) setGithubRepoUrl(d.deployment.deploymentUrl) })
      .catch(() => {})
  }, [project.id]);


  // BuildFlow Hosting - Simple publish
  const handlePublishToBuildFlow = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('🎉 Published to BuildFlow!', {
          duration: 2000,
          id: 'published-buildflow',
        });
        setShareModalOpen(true);
        onRefresh?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to publish');
      }
    } catch {
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  // Copy URL logic
  const handleCopyUrl = async (project: Project) => {
    try {
      let urlToCopy = '';
      if (project.publicUrl) {
        urlToCopy = project.publicUrl;
      } else if (project.publicSlug) {
        urlToCopy = `https://buildflow-ai.app/p/${project.publicSlug}`;
      } else if (project.id) {
        urlToCopy = `https://buildflow-ai.app/projects/${project.id}`;
      } else {
        toast.error('No URL available to copy');
        return;
      }
      await navigator.clipboard.writeText(urlToCopy);
      toast.success(`✅ Copied: ${urlToCopy}`);
      console.log('✅ Copied URL:', urlToCopy);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // View Site logic
  const handleViewSite = (project: Project) => {
    let siteUrl = '';
    if (project.publicUrl) {
      siteUrl = project.publicUrl;
    } else if (project.publicSlug) {
      siteUrl = `/p/${project.publicSlug}`;
    } else {
      toast.error('This project is not published yet');
      return;
    }
    window.open(siteUrl, '_blank');
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
        toast.success('✅ Exported to GitHub!', {
          duration: 2000,
          id: 'export-github-1',
        });
        
        // Now deploy to Vercel
        await deployToVercel(exportData.repoName);
      } else {
        // Already on GitHub - deploy directly
        toast.loading('Deploying to Vercel...', { id: 'deploy-vercel' });
        await deployToVercel(githubData.repoName);
      }
    } catch {
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
        toast.success('🚀 Deployed to Vercel!', {
          duration: 2000,
          id: 'deployed-vercel',
        });
        window.open(data.deploymentUrl, '_blank');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Deployment failed', { id: 'deploy-vercel' });
      }
    } catch {
      toast.error('Deployment failed', { id: 'deploy-vercel' });
    } finally {
      setDeployingVercel(false);
    }
  };

  const handleExport = async (type: 'github' | 'zip') => {
    try {
      if (type === 'github') {
        const res = await fetch(`/api/projects/${project.id}/publish/github`, {
          method: 'POST',
        });
        
        if (res.ok) {
          const data = await res.json();
          toast.success('✅ Exported to GitHub!', {
            duration: 2000,
            id: 'export-github-2',
          });
          if (data.repoUrl) setGithubRepoUrl(data.repoUrl);
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
        toast.success('📦 Downloaded!', {
          duration: 2000,
          id: 'project-downloaded',
        });
      }
    } catch {
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
                    <Icons.Globe className="w-3 h-3" />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium whitespace-nowrap">
                    <Icons.GlobeLock className="w-3 h-3" />
                    Draft
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {project.description || 'No description provided'}
                </span>
                {githubRepoUrl && (
                  <a
                    href={githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-full font-medium hover:opacity-80 transition"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </a>
                )}
              </div>
            </div>

            {/* More Menu */}
            <div className="relative ml-2">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                type="button"
              >
                <Icons.MoreVertical className="w-5 h-5 text-gray-500" />
              </button>

              {menuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <a
                      href={`/chatbuilder?project=${project.id}`}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                    >
                      <Icons.Edit3 className="w-4 h-4" />
                      Edit Project
                    </a>
                    <button
                      onClick={() => {
                        handleExport('github');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                      </svg>
                      Export to GitHub
                    </button>
                    <button
                      onClick={() => {
                        handleExport('zip');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                      type="button"
                    >
                      <Icons.Download className="w-4 h-4" />
                      Download ZIP
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => {
                        onDelete?.();
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 transition"
                      type="button"
                    >
                      <Icons.Trash2 className="w-4 h-4" />
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
                <Icons.Eye className="w-3.5 h-3.5" />
                <span>{project.views} views</span>
              </div>
              <div>
                Published {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown date'}
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex items-center gap-2 mb-3">
            {/* View Site Button - Only show if published */}
            {project.isPublished && (project.publicUrl || project.publicSlug) && (
              <button
                onClick={() => handleViewSite(project)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title="View published site"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Site
              </button>
            )}

            {/* Preview Button - Always available */}
            <a
              href={project.id ? `/preview/${project.id}` : '#'}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
              title="Preview project code and site"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.Eye className="w-4 h-4" />
              Preview
            </a>

            {/* Copy URL Button */}
            <button
              onClick={() => handleCopyUrl(project)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
              title="Copy project URL"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy URL
            </button>

            {/* Publish Status Badge */}
            {project.isPublished ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Published
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
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
                <Icons.Zap className="w-4 h-4" />
                {publishing ? 'Publishing...' : 'Publish to BuildFlow'}
              </button>
            ) : (
              <button
                onClick={() => setShareModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-semibold shadow-sm"
                title="Share your published site"
                type="button"
              >
                <Icons.Share2 className="w-4 h-4" />
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
              <Icons.Zap className="w-3 h-3 text-purple-500" />
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
      {project.isPublished && shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectName={project.name}
          publicUrl={
            project.publicUrl ||
            (project.publicSlug ? `https://buildflow-ai.app/p/${project.publicSlug}` : '')
          }
          views={project.views}
        />
      )}
    </>
  );
}
