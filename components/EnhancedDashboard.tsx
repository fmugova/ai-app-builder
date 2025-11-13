"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  Eye,
  Share2,
  History,
  Trash2,
  X,
  Edit,
  Code,
  ExternalLink,
  CheckSquare,
  Square,
  BarChart3,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  shareToken?: string;
}

export default function EnhancedDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Modal states
  const [showPreview, setShowPreview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Data states
  const [projectCount, setProjectCount] = useState(0);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [generationsLimit, setGenerationsLimit] = useState(3);
  const [currentPlan, setCurrentPlan] = useState("Free");
  
  // Share states
  const [shareLoading, setShareLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch projects with auto-refresh
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/projects");
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
          setProjectCount(data.projects?.length || 0);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch usage data with auto-refresh
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch("/api/user/usage");
        if (response.ok) {
          const data = await response.json();
          setGenerationsUsed(data.generationsUsed || 0);
          setGenerationsLimit(data.generationsLimit || 3);
        }
      } catch (error) {
        console.error("Error fetching usage:", error);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Bulk selection handlers
  const toggleProjectSelection = (projectId: string) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const selectAllProjects = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) return;
    
    if (confirm(`Delete ${selectedProjects.size} project(s)?`)) {
      try {
        await Promise.all(
          Array.from(selectedProjects).map((id) =>
            fetch(`/api/projects/${id}`, { method: "DELETE" })
          )
        );
        setProjects(projects.filter((p) => !selectedProjects.has(p.id)));
        setSelectedProjects(new Set());
        setBulkActionMode(false);
      } catch (error) {
        console.error("Error deleting projects:", error);
        alert("Failed to delete some projects");
      }
    }
  };

  // Project actions
  const handlePreview = (project: Project) => {
    setSelectedProject(project);
    setShowPreview(true);
  };

  const handleShare = (project: Project) => {
    setSelectedProject(project);
    setShowShare(true);
  };

  const handleHistory = (project: Project) => {
    setSelectedProject(project);
    setShowHistory(true);
  };

  const handleDelete = async (project: Project) => {
    setSelectedProject(project);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== selectedProject.id));
        setShowDelete(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  };

  const handleEdit = (project: Project) => {
    router.push(`/builder?edit=${project.id}`);
  };

  // Share functionality
  const togglePublicShare = async () => {
    if (!selectedProject) return;
    
    setShareLoading(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !selectedProject.isPublic }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedProject(data.project);
        setProjects(
          projects.map((p) =>
            p.id === selectedProject.id ? data.project : p
          )
        );
      }
    } catch (error) {
      console.error("Error toggling share:", error);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!selectedProject?.shareToken) return;
    
    const shareUrl = `${window.location.origin}/share/${selectedProject.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const remainingGenerations = generationsLimit - generationsUsed;
  const usagePercentage = (generationsUsed / generationsLimit) * 100;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? "dark bg-gray-900" : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header with Logo and User Menu */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              BuildFlow
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Analytics Button */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              {showAnalytics ? "Hide Analytics" : "Analytics"}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="hidden md:block font-medium">
                  {session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {session?.user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {session?.user?.email}
                      </p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    
                    <Link
                      href="/pricing"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pricing & Plans
                    </Link>

                    <hr className="my-2 border-gray-200 dark:border-gray-700" />

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="mb-8">
            <AnalyticsDashboard userId={session?.user?.email || undefined} />
          </div>
        )}

        {/* Welcome Banner */}
        {showWelcome && !showAnalytics && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 mb-8 relative overflow-hidden">
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to BuildFlow! 🎉
                </h2>
                <p className="text-white/90 text-lg">
                  Create production-ready code in minutes. Start building your next project now.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 dark:text-gray-400 font-medium">Current Plan</h3>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {currentPlan}
            </p>
            <Link
              href="/pricing"
              className="block w-full text-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              Upgrade Plan →
            </Link>
          </div>

          {/* Generations Used */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 dark:text-gray-400 font-medium">Generations Used</h3>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {generationsUsed} / {generationsLimit}
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {remainingGenerations} remaining
            </p>
          </div>

          {/* Projects Created */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 dark:text-gray-400 font-medium">Projects Created</h3>
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {projectCount}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {projectCount === 0 ? "Start your first project" : "Keep up the great work!"}
            </p>
          </div>
        </div>

        {/* Projects Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Projects
          </h2>
          <div className="flex gap-3">
            {projects.length > 0 && (
              <button
                onClick={() => {
                  setBulkActionMode(!bulkActionMode);
                  setSelectedProjects(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  bulkActionMode
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                <CheckSquare className="w-5 h-5" />
                {bulkActionMode ? "Cancel" : "Select"}
              </button>
            )}
            <Link
              href="/builder"
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              New Project
            </Link>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {bulkActionMode && selectedProjects.size > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllProjects}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedProjects.size === projects.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                {selectedProjects.size === projects.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-gray-600 dark:text-gray-400">
                {selectedProjects.size} project(s) selected
              </span>
            </div>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
              <Code className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No projects yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first project to get started
            </p>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Start Building
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all ${
                  bulkActionMode && selectedProjects.has(project.id)
                    ? "border-blue-500 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800"
                    : "border-gray-200 dark:border-gray-700 hover:shadow-lg"
                }`}
              >
                {bulkActionMode && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => toggleProjectSelection(project.id)}
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400"
                    >
                      {selectedProjects.has(project.id) ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                      <span className="font-medium">
                        {selectedProjects.has(project.id) ? "Selected" : "Select"}
                      </span>
                    </button>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                      {project.name}
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                      {project.type}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {project.description || "No description"}
                  </p>

                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>

                  {!bulkActionMode && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePreview(project)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>

                      <button
                        onClick={() => handleShare(project)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>

                      <button
                        onClick={() => handleHistory(project)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                      >
                        <History className="w-4 h-4" />
                        History
                      </button>

                      <button
                        onClick={() => handleDelete(project)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedProject.name}
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedProject.description || "No description provided"}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Code</h4>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedProject.code);
                        alert("Code copied to clipboard!");
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{selectedProject.code}</code>
                  </pre>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(selectedProject)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Project
                  </button>
                  <a
                    href={`data:text/html;charset=utf-8,${encodeURIComponent(selectedProject.code)}`}
                    download={`${selectedProject.name}.html`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShare && selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Share Project
                </h3>
                <button
                  onClick={() => setShowShare(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectedProject.isPublic || false}
                        onChange={togglePublicShare}
                        disabled={shareLoading}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Make project public
                    </span>
                  </label>
                </div>

                {selectedProject.isPublic && selectedProject.shareToken && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Public Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/share/${selectedProject.shareToken}`}
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={copyShareLink}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        {copySuccess ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {copySuccess && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Link copied to clipboard!
                      </p>
                    )}
                  </div>
                )}

                {!selectedProject.isPublic && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enable public sharing to get a shareable link that anyone can view.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Version History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Current Version
                        </h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(selectedProject.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Latest changes to the project
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No previous versions available
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDelete && selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Delete Project
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{selectedProject.name}</span>?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDelete(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}