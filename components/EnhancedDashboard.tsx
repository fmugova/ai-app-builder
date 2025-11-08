"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Sparkles, TrendingUp, Clock, Zap, LogOut, ChevronDown, Settings } from "lucide-react";
import { getRecentProjects } from "@/utils/projectHistory";

interface Project {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
  thumbnail?: string;
}

interface DashboardProps {
  user?: {
    name?: string;
    email?: string;
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
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  // Load recent projects from localStorage
  useEffect(() => {
    const projects = getRecentProjects();
    setRecentProjects(projects);
  }, []);

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
    setIsLoading(true);
    // Navigate to builder page
    setTimeout(() => {
      window.location.href = "/builder";
    }, 500);
  };

  const handleLogout = async () => {
    try {
      const { handleSignOut } = await import("@/app/actions/auth");
      await handleSignOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/pricing";
  };

  const generationsRemaining = generationsLimit - generationsUsed;
  const usagePercentage = (generationsUsed / generationsLimit) * 100;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "dark bg-gray-950" : "bg-gradient-to-br from-gray-50 via-primary-50/30 to-secondary-50/30"
    }`}>
      {/* Header */}
      <header className="backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 group cursor-pointer">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 blur-xl bg-primary-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-2xl font-bold text-gradient">
                BuildFlow
              </span>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl px-3 py-2 transition-all hover:scale-105"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    {user?.name || "Welcome!"}
                  </span>
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-primary-100 dark:ring-primary-900">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 hidden sm:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 glass dark:glass-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-slide-down">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {user?.name || "User"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {user?.email || "user@buildflow.ai"}
                        </p>
                        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-semibold text-primary-700 dark:text-primary-400">
                          <Zap className="w-3 h-3 mr-1" />
                          {currentPlan} Plan
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors flex items-center gap-2"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {showWelcome && (
          <div className="mb-8 gradient-primary rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl animate-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24" />
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-all text-2xl"
            >
              ×
            </button>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-3 flex items-center gap-2">
                Welcome to BuildFlow!
                <Sparkles className="w-8 h-8 animate-pulse" />
              </h2>
              <p className="text-white/90 text-lg max-w-2xl">
                Create production-ready code in minutes with AI-powered generation, automatic saving, and project history. Start building your next project now.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Plan Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-100 dark:border-gray-800 transition-all hover:scale-105 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Current Plan
              </h3>
              <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                <Zap className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
              {currentPlan}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {currentPlan === "Free" ? "Great for getting started" : "Unlimited power"}
            </p>
            <button
              onClick={handleUpgrade}
              className="w-full px-4 py-3 gradient-primary hover:opacity-90 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              {currentPlan === "Free" ? "Upgrade Plan →" : "Manage Plan"}
            </button>
          </div>

          {/* Generations Used Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-100 dark:border-gray-800 transition-all hover:scale-105 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Generations
              </h3>
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
              {generationsUsed} <span className="text-2xl text-gray-400">/ {generationsLimit}</span>
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  {generationsRemaining} remaining
                </span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {usagePercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    usagePercentage > 80
                      ? "bg-gradient-to-r from-error-500 to-error-600"
                      : usagePercentage > 50
                      ? "bg-gradient-to-r from-warning-500 to-warning-600"
                      : "bg-gradient-to-r from-success-500 to-success-600"
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Projects Created Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-100 dark:border-gray-800 transition-all hover:scale-105 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Projects
              </h3>
              <div className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-900/30">
                <Clock className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
              {recentProjects.length}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {recentProjects.length > 0
                ? "Keep up the great work! 🎉"
                : "Start your first project ✨"}
            </p>
          </div>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary-600" />
              Recent Projects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => window.location.href = `/builder?project=${project.id}`}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer group text-left transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 transition-colors">
                      <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                    {project.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
                    {project.type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold">
                    {new Date(project.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 border border-gray-100 dark:border-gray-800">
          <div className="text-center py-8">
            <div className="mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 mx-auto gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-2xl transform hover:scale-110 transition-transform rotate-3 hover:rotate-6">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="absolute inset-0 blur-2xl bg-primary-500/30 opacity-50" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Ready to Build Something Amazing?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Start a new project with AI-powered code generation or continue where you left off
              </p>
            </div>
            <button
              onClick={handleNewProject}
              disabled={isLoading}
              className="inline-flex items-center px-10 py-5 gradient-primary hover:opacity-90 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-2xl"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 mr-3" />
                  Create New Project
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16 py-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            BuildFlow - Build Beautiful Apps Instantly ✨
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Powered by AI, designed for developers
          </p>
        </div>
      </footer>
    </div>
  );
}
