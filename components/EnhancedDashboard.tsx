"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Moon, Sun, Sparkles, TrendingUp, Clock, Zap,
  Trash2, Share2, Edit, BarChart3, Shield,
  Eye, History, CheckSquare, Square, Trash, X, LogOut
} from "lucide-react";
import ProjectSharingModal from "./ProjectSharingModal";
import VersionHistoryModal from "./VersionHistoryModal";
import AnalyticsDashboard from "./AnalyticsDashboard";
import CodePreviewModal from "./CodePreviewModal";

interface Project {
  id: string;
  name: string;
  type: string;
  description?: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
  isPublic?: boolean;
}

interface DashboardProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  currentPlan?: string;
  generationsUsed?: number;
  generationsLimit?: number;
}

export default function EnhancedDashboard({
  user,
  currentPlan = "Free",
  generationsUsed = 1,
  generationsLimit = 3,
}: DashboardProps) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Modal states
  const [sharingModal, setSharingModal] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
  });
  const [versionModal, setVersionModal] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
  });
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
  });

  // Bulk actions state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === 'admin';

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || 
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleNewProject = () => {
    router.push('/builder');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  // Bulk Actions
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedProjects(new Set());
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const selectAllProjects = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) return;
    
    if (!confirm(`Delete ${selectedProjects.size} project(s)? This cannot be undone.`)) return;

    try {
      const deletePromises = Array.from(selectedProjects).map(id =>
        fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      setProjects(projects.filter(p => !selectedProjects.has(p.id)));
      setSelectedProjects(new Set());
      setBulkMode(false);
    } catch (error) {
      console.error('Error deleting projects:', error);
      alert('Failed to delete some projects');
    }
  };

  const generationsRemaining = generationsLimit - generationsUsed;
  const usagePercentage = (generationsUsed / generationsLimit) * 100;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "dark bg-gray-900" : "bg-gray-50"
    }`}>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                BuildFlow
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm font-medium"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              )}
              
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Panel */}
        {isAdmin && showAdminPanel && (
          <div className="mb-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                  <p className="text-white/90">System overview and management</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-white/80 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {showAnalytics && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Hide Analytics
              </button>
            </div>
            <AnalyticsDashboard userId={user?.email} />
          </div>
        )}

        {/* Welcome Banner */}
        {showWelcome && !showAnalytics && (
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-2">Welcome to BuildFlow! 🚀</h2>
            <p className="text-white/90">
              Create production-ready code in minutes. Start building your next project now.
            </p>
          </div>
        )}

        {/* Stats Grid */}
        {!showAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Current Plan
                </h3>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {currentPlan}
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
              >
                Upgrade Plan →
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Generations Used
                </h3>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {generationsUsed} / {generationsLimit === -1 ? '∞' : generationsLimit}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {generationsLimit === -1 ? 'Unlimited' : `${generationsRemaining} remaining`}
                  </span>
                  {generationsLimit !== -1 && (
                    <span className="text-gray-600 dark:text-gray-400">
                      {usagePercentage.toFixed(0)}%
                    </span>
                  )}
                </div>
                {generationsLimit !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        usagePercentage > 80
                          ? "bg-red-500"
                          : usagePercentage > 50
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Projects Created
                </h3>
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {projects.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {projects.length > 0 
                  ? "Keep up the great work!" 
                  : "Start your first project"}
              </p>
            </div>
          </div>
        )}

        {/* Projects Section */}
        {!showAnalytics && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Projects
              </h3>
              <div className="flex items-center gap-2">
                {projects.length > 0 && (
                  <button
                    onClick={toggleBulkMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      bulkMode
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    {bulkMode ? 'Cancel' : 'Select'}
                  </button>
                )}
                <button
                  onClick={handleNewProject}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  New Project
                </button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulkMode && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={selectAllProjects}
                    className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    {selectedProjects.size === projects.length ? (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        Select All
                      </>
                    )}
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedProjects.size} selected
                  </span>
                </div>
                {selectedProjects.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                    Delete Selected ({selectedProjects.size})
                  </button>
                )}
              </div>
            )}

            {loadingProjects ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border transition-all ${
                      bulkMode && selectedProjects.has(project.id)
                        ? "border-blue-500 ring-2 ring-blue-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
                    }`}
                  >
                    {bulkMode && (
                      <div className="mb-3">
                        <button
                          onClick={() => toggleProjectSelection(project.id)}
                          className="w-full flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          {selectedProjects.has(project.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {selectedProjects.has(project.id) ? 'Selected' : 'Select'}
                          </span>
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {project.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {project.type}
                        </p>
                        {project.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>

                    {!bulkMode && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPreviewModal({ isOpen: true, project })}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                        
                        <button
                          onClick={() => setSharingModal({ isOpen: true, project })}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        
                        <button
                          onClick={() => setVersionModal({ isOpen: true, project })}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          <History className="w-4 h-4" />
                          History
                        </button>
                        
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Projects Yet
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Start building something amazing! Create your first AI-powered project.
                  </p>
                  <button
                    onClick={handleNewProject}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Your First Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <ProjectSharingModal
        project={sharingModal.project!}
        isOpen={sharingModal.isOpen}
        onClose={() => setSharingModal({ isOpen: false, project: null })}
        onUpdate={(updates) => {
          setProjects(projects.map(p => 
            p.id === sharingModal.project?.id ? { ...p, ...updates } : p
          ));
        }}
      />

      <VersionHistoryModal
        project={versionModal.project!}
        isOpen={versionModal.isOpen}
        onClose={() => setVersionModal({ isOpen: false, project: null })}
        onRestore={() => fetchProjects()}
      />

      <CodePreviewModal
        project={previewModal.project!}
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, project: null })}
        onEdit={() => {
          localStorage.setItem('currentProject', JSON.stringify(previewModal.project));
          router.push(`/builder?project=${previewModal.project?.id}`);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>BuildFlow - Build Beautiful Apps with AI</p>
        </div>
      </footer>
    </div>
  );
}