'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { signOut } from 'next-auth/react'
import ProjectCard from '@/components/ProjectCard'
import type { Project } from '@/types/project'

// Lazy load heavy components
const SimpleExportButton = dynamic(() => import('@/components/SimpleExportButton'), {
  loading: () => <div className="text-sm text-gray-400">Loading export...</div>,
  ssr: false,
})

const OnboardingTutorial = dynamic(() => import('@/components/OnboardingTutorial'), {
  ssr: false,
})

const QuickTips = dynamic(() => import('@/components/OnboardingTutorial').then(mod => ({ default: mod.QuickTips })), {
  ssr: false,
})

// Icons
const SunIcon = () => (
  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

interface UserStats {
  projectsThisMonth: number
  projectsLimit: number
  generationsUsed: number
  generationsLimit: number
  subscriptionTier: string
  subscriptionStatus: string
}

interface DashboardClientProps {
  initialProjects: Project[]
  stats: UserStats
  userName: string | null
  userEmail: string | null
  isAdmin: boolean
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export default function DashboardClient({
  initialProjects,
  stats,
  userName,
  userEmail,
  isAdmin,
}: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [exportProject, setExportProject] = useState<Project | null>(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showTutorial, setShowTutorial] = useState(false)

  // Toast notification system
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000) // 4 seconds
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Check for success messages in URL params
  useEffect(() => {
    const created = searchParams?.get('created')
    const published = searchParams?.get('published')
    const welcome = searchParams?.get('welcome')

    if (created === 'true') {
      addToast('🎉 Project created successfully!', 'success')
      // Clean up URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    if (published === 'true') {
      addToast('✨ Project published successfully!', 'success')
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    if (welcome === 'true') {
      setTimeout(() => {
        addToast(`👋 Welcome back, ${userName || 'Developer'}!`, 'info')
      }, 500)
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, userName])

  useEffect(() => {
    fetch('/api/analytics?type=dashboard').catch(() => {})
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setProjects(projects.filter(p => p.id !== projectId))
        addToast('Project deleted successfully', 'success')
      } else {
        addToast('Failed to delete project', 'error')
      }
    } catch (error) {
      console.error('Delete error:', error)
      addToast('Failed to delete project', 'error')
    }
  }

  const filteredProjects = projects.filter(project =>
    (project.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'from-purple-500 to-pink-500'
      case 'business': return 'from-blue-500 to-cyan-500'
      case 'pro': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const projectsPercentage = getUsagePercentage(stats.projectsThisMonth, stats.projectsLimit)
  const generationsPercentage = getUsagePercentage(stats.generationsUsed, stats.generationsLimit)

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm border animate-slide-in-right ${
              toast.type === 'success' 
                ? 'bg-green-900/90 border-green-700 text-green-100' 
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-700 text-red-100'
                : 'bg-blue-900/90 border-blue-700 text-blue-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <p className="font-medium">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 hover:opacity-70 transition"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-white">
            BuildFlow
          </a>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/submissions" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium">
              Forms Submissions
            </Link>
            <Link href="/dashboard/analytics" className="px-4 py-2 text-gray-300 hover:text-white text-sm flex items-center gap-2">
              📊 Analytics
            </Link>
            <Link href="/dashboard/domains" className="px-4 py-2 text-gray-300 hover:text-white text-sm flex items-center gap-2">
              🌐 Custom Domains
            </Link>
            <Link href="/dashboard/database" className="px-4 py-2 text-gray-300 hover:text-white text-sm flex items-center gap-2">
              🗄️ Database
            </Link>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-300"
              aria-label="Favorites"
            >
              <StarIcon />
            </button>
            <Link href="/pricing" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium">
              Upgrade
            </Link>
            <Link href="/contact" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium">
              Contact Support
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition bg-green-900/30 border border-green-700"
              >
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-white text-sm font-medium">Welcome back!</span>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
              {showAccountMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAccountMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                    <div className="p-3 border-b border-gray-700">
                      <p className="text-white font-medium text-sm truncate">{userName || 'User'}</p>
                      <p className="text-gray-400 text-xs truncate">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm">
                        ⚙️ Settings
                      </Link>
                      <Link href="/billing" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm">
                        💳 Billing
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-yellow-400 hover:bg-gray-700 text-sm">
                          👑 Admin Panel
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-700">
                      <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-gray-700 text-sm"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Builder Navigation */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/builder" className={`p-6 border rounded-lg hover:shadow transition ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Traditional Builder</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Your current workflow</p>
          </Link>
          <Link href="/chatbuilder" className={`p-6 border rounded-lg hover:shadow transition ${isDarkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chat Builder 🆕</h3>
            <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>Upload files • Iterate with AI</p>
          </Link>
        </div>

        {/* Welcome */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Welcome back, {userName || 'Fidelis Mugova'}! 👋
          </h2>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {projects.length === 0 
              ? "Let's build something amazing with AI-powered app generation."
              : `You have ${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace.`
            }
          </p>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-xl flex items-center justify-center`}>
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Projects</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.projectsThisMonth}/{stats.projectsLimit}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                <div className={`h-2 rounded-full ${getUsageColor(projectsPercentage)}`} style={{ width: `${projectsPercentage}%` }}></div>
              </div>
              <p className="text-xs text-gray-400">{projectsPercentage.toFixed(0)}% used this month</p>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-xl flex items-center justify-center`}>
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Generations</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.generationsUsed}/{stats.generationsLimit}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                <div className={`h-2 rounded-full ${getUsageColor(generationsPercentage)}`} style={{ width: `${generationsPercentage}%` }}></div>
              </div>
              <p className="text-xs text-gray-400">{generationsPercentage.toFixed(0)}% used this month</p>
            </div>
          </div>

          <div className={`bg-gradient-to-br ${getTierColor(stats.subscriptionTier)} rounded-2xl p-6 border border-gray-700`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-white/80">Your Plan</p>
                <p className="text-2xl font-bold text-white capitalize">{stats.subscriptionTier}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
            </div>
            {stats.subscriptionTier === 'free' && (
              <Link href="/pricing" className="block w-full bg-white text-gray-900 hover:bg-gray-100 py-2 rounded-lg transition font-semibold text-sm text-center">
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => router.push('/builder')} 
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
              <span className="text-2xl">✨</span>
            </div>
            <div className="text-left">
              <p className="font-semibold text-white">New Project</p>
              <p className="text-xs text-white/80">Create with AI</p>
            </div>
          </button>

          <button 
            onClick={() => router.push('/templates')}
            className={`flex items-center gap-3 p-4 rounded-xl transition group ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Templates</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>6 ready to use</p>
            </div>
          </button>

          <button 
            onClick={() => setShowTutorial(true)}
            className={`flex items-center gap-3 p-4 rounded-xl transition group ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className="text-2xl">🎓</span>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tutorial</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Learn the basics</p>
            </div>
          </button>

          <button 
            onClick={() => window.location.href = 'mailto:support@buildflow-ai.app'}
            className={`flex items-center gap-3 p-4 rounded-xl transition group ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Get Help</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email support</p>
            </div>
          </button>
        </div>

        {/* Multi-Page Features Banner */}
        {projects.length > 0 && (
          <div className={`mb-8 ${isDarkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'} rounded-2xl p-6 border`}>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              🚀 Multi-Page Project Tools
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📄</span>
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pages Manager</h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Create and organize multiple pages
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🧭</span>
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Navigation</h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Design site navigation
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🔍</span>
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>SEO</h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Optimize for search engines
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Projects Section */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Your Projects</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 placeholder-gray-500'} border rounded-lg`}
              />
              <Link href="/builder" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium flex items-center gap-2">
                <span className="text-lg">✨</span>
                New Project
              </Link>
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project) => (
                <div key={project.id}>
                  <ProjectCard
                    project={{
                      ...project,
                      createdAt: new Date(project.createdAt),
                      updatedAt: new Date(project.updatedAt),
                      description: project.description || '',
                      type: project.type || '',
                      isPublished: project.isPublished ?? false,
                      publicUrl: project.publicUrl || null,
                      views: project.views ?? 0,
                    }}
                    onDelete={() => handleDeleteProject(project.id)}
                    onRefresh={() => window.location.reload()}
                  />
                  <div className={`mt-3 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Manage
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/projects/${project.id}`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition`}>
                        ⚙️ Overview
                      </Link>
                      <Link href={`/dashboard/projects/${project.id}/pages`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} transition`}>
                        📄 Pages
                      </Link>
                      <Link href={`/dashboard/projects/${project.id}/navigation`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition`}>
                        🧭 Nav
                      </Link>
                      <Link href={`/dashboard/projects/${project.id}/seo`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70' : 'bg-green-100 text-green-700 hover:bg-green-200'} transition`}>
                        🔍 SEO
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className={`w-24 h-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <span className="text-5xl">📭</span>
              </div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                {searchQuery ? 'No projects match your search' : 'No projects yet'}
              </h3>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {searchQuery ? 'Try a different search term' : "Let's create your first AI-powered project"}
              </p>
              <Link href="/builder" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">
                Create Your First Project
              </Link>
            </div>
          )}
        </div>
      </div>

      <OnboardingTutorial />
      <QuickTips />

      {/* Add CSS for toast animation */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}