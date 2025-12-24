'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { DashboardMobileMenu } from '@/components/DashboardMobileMenu'
import { signOut } from 'next-auth/react'

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

// Types
interface Project {
  id: string
  name: string
  description: string | null
  code: string | null
  prompt: string | null
  type: string
  createdAt: string
  updatedAt: string
  isPublished?: boolean
  publicUrl?: string | null
  views?: number
}

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

export default function DashboardClient({
  initialProjects,
  stats,
  userName,
  userEmail,
  isAdmin,
}: DashboardClientProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [exportProject, setExportProject] = useState<Project | null>(null)
  // Account menu state
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    }
  }, [])

  // Save dark mode preference to localStorage and update document
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
        setShowDeleteConfirm(null)
        alert('Project deleted successfully!')
      } else {
        alert('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete project')
    }
  }

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.project) {
          setProjects([data.project, ...projects])
          alert('Project duplicated successfully!')
        } else {
          alert('Failed to duplicate project')
        }
      } else {
        alert('Failed to duplicate project')
      }
    } catch (error) {
      console.error('Duplicate error:', error)
      alert('Failed to duplicate project')
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

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise': return { text: 'Enterprise', color: 'bg-purple-900 text-purple-200 border-purple-700' }
      case 'business': return { text: 'Business', color: 'bg-blue-900 text-blue-200 border-blue-700' }
      case 'pro': return { text: 'Pro', color: 'bg-green-900 text-green-200 border-green-700' }
      default: return { text: 'Free', color: 'bg-gray-700 text-gray-300 border-gray-600' }
    }
  }

  const tierBadge = getTierBadge(stats.subscriptionTier)
  const projectsPercentage = getUsagePercentage(stats.projectsThisMonth, stats.projectsLimit)
  const generationsPercentage = getUsagePercentage(stats.generationsUsed, stats.generationsLimit)

  return (

    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-white">
            BuildFlow
          </a>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
              aria-label="Toggle theme"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            {/* Settings */}
            <a
              href="/settings"
              className="p-2 hover:bg-gray-800 rounded-lg transition"
              title="Settings"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V4m0 16v-4m8-4h-4m-8 0H4" /></svg>
            </a>
            {/* Pricing Link */}
            <a
              href="/pricing"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium"
            >
              Upgrade
            </a>
            {/* Contact Support */}
            <a
              href="/contact"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
            >
              Contact Support
            </a>
            {/* Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu && setShowAccountMenu((v: boolean) => !v)}
                className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
              {typeof setShowAccountMenu === 'function' && showAccountMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowAccountMenu(false)}
                  />
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                    <div className="p-3 border-b border-gray-700">
                      <p className="text-white font-medium text-sm truncate">
                        {userName || 'User'}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {userEmail}
                      </p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                          {/* Shield icon */}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V7l7-4z" /></svg>
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      <a
                        href="/settings"
                        onClick={() => setShowAccountMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm transition"
                      >
                        {/* Settings icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V4m0 16v-4m8-4h-4m-8 0H4" /></svg>
                        Settings
                      </a>
                      <a
                        href="/settings/billing"
                        onClick={() => setShowAccountMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm transition"
                      >
                        {/* LayoutGrid icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        Billing
                      </a>
                      {isAdmin && (
                        <a
                          href="/admin"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-yellow-400 hover:bg-gray-700 text-sm transition"
                        >
                          {/* Shield icon */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V7l7-4z" /></svg>
                          Admin Panel
                        </a>
                      )}
                    </div>
                    <div className="border-t border-gray-700">
                      <button
                        onClick={() => {
                          setShowAccountMenu(false)
                          signOut()
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-gray-700 text-sm transition"
                      >
                        {/* LogOut icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                        Sign Out
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Welcome back, {userName || 'Developer'}! 👋
          </h2>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {projects.length === 0 
              ? "Let's build something amazing with AI-powered app generation."
              : `You have ${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace.`
            }
          </p>
        </div>

        {/* Usage Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Projects Usage */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'} rounded-2xl p-6 border transition`}>
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
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor(projectsPercentage)}`}
                  style={{ width: `${projectsPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">
                {projectsPercentage.toFixed(0)}% used this month
              </p>
            </div>
          </div>

          {/* Generations Usage */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'} rounded-2xl p-6 border transition`}>
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
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor(generationsPercentage)}`}
                  style={{ width: `${generationsPercentage}%` }}
                ></div>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {generationsPercentage.toFixed(0)}% used this month
              </p>
            </div>
          </div>

          {/* Subscription Status */}
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
              <Link
                href="/pricing"
                className="block w-full bg-white text-gray-900 hover:bg-gray-100 py-2 rounded-lg transition font-semibold text-sm text-center"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* New Project */}
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

          {/* Templates */}
          <button
            onClick={() => router.push('/templates')}
            className={`flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'} border hover:border-purple-500 rounded-xl transition group`}
          >
            <div className={`w-10 h-10 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} group-hover:text-blue-400 transition`}>Templates</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>6 ready to use</p>
            </div>
          </button>

          {/* Tutorial */}
          <button
            onClick={() => {
              localStorage.removeItem('buildflow_onboarding_completed')
              window.location.reload()
            }}
            className={`flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'} border hover:border-green-500 rounded-xl transition group`}
          >
            <div className={`w-10 h-10 ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
              <span className="text-2xl">🎓</span>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} group-hover:text-green-400 transition`}>Tutorial</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Learn the basics</p>
            </div>
          </button>

          {/* Get Help */}
          <button
            onClick={() => {
              const email = userEmail || ''
              const subject = 'BuildFlow Support Request'
              const body = `Hi BuildFlow Team,\n\nI need help with:\n\n[Describe your issue here]\n\nUser: ${email}\nProjects: ${projects.length}`
              window.location.href = `mailto:support@buildflow-ai.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
            }}
            className={`flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'} border hover:border-orange-500 rounded-xl transition group`}
          >
            <div className={`w-10 h-10 ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-left">
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} group-hover:text-orange-400 transition`}>Get Help</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email support</p>
            </div>
          </button>
        </div>

        {/* Projects Section */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
          {/* Projects Header */}
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
                className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
              <Link
                href="/builder"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                <span>✨</span>
                <span>New Project</span>
              </Link>
            </div>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200'} rounded-2xl border hover:border-purple-500/50 transition-all duration-300 overflow-hidden group hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-[320px]`}
                >
                  {/* Card Header with Gradient */}
                  <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
                  
                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Top Row: Icon + Meta */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-xl">📱</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Project Title - Fixed Height */}
                    <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 group-hover:text-purple-400 transition-colors line-clamp-1`}>
                      {project.name}
                    </h4>
                    
                    {/* Description - Fixed Height */}
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2 h-10 mb-4`}>
                      {project.description || 'No description provided'}
                    </p>

                    {/* Spacer to push actions to bottom */}
                    <div className="flex-1"></div>

                    {/* Action Buttons - Compact Grid */}
                    <div className="space-y-2">
                      {/* Primary Actions Row */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push(`/builder?project=${project.id}`)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(`/preview/${project.id}`, '_blank')
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedProject(project)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          Code
                        </button>
                      </div>
                      
                      {/* Secondary Actions Row */}
                      <div className="flex gap-2">
                        {project.code && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setExportProject(project)
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDuplicateProject(project.id)
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${isDarkMode ? 'text-white' : 'text-gray-700'} rounded-lg transition-colors text-sm font-medium`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowDeleteConfirm(project.id)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                          title="Delete project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === project.id && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-md w-full border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-2xl`}>
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 text-center`}>Delete Project?</h3>
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6 text-center`}>
                          Are you sure you want to delete <span className="font-semibold">"{project.name}"</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className={`flex-1 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${isDarkMode ? 'text-white' : 'text-gray-900'} py-2.5 rounded-xl transition font-medium`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className={`w-24 h-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <span className="text-5xl">📭</span>
              </div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode && setIsDarkMode((prev: boolean) => !prev)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          )}
        </div>

        {/* Upgrade CTA for Free Users */}
        {stats.subscriptionTier === 'free' && projects.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-8 border border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Ready to build more? 🚀
                </h3>
                <p className="text-gray-300 mb-4">
                  Upgrade to Pro for unlimited projects, faster AI generations, and priority support.
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Unlimited projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>500 AI generations/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <div className="text-right">
                <Link
                  href="/pricing"
                  className="inline-block px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition font-bold text-lg mb-2"
                >
                  Upgrade to Pro
                </Link>
                <p className="text-sm text-gray-400">Starting at $29/month</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Tutorial - Auto-shows on first visit */}
      <OnboardingTutorial />
      
      {/* Quick Tips - Shows helpful tips periodically */}
      <QuickTips />

      {/* Code Preview Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-2xl flex flex-col`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} flex items-center justify-between`}>
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedProject.name}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  View and copy your project code
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (selectedProject.code) {
                      await navigator.clipboard.writeText(selectedProject.code)
                      alert('Code copied to clipboard!')
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Code
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className={`p-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'} rounded-lg transition-colors`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Code Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedProject.code ? (
                <pre className={`text-sm ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800'} p-4 rounded-lg overflow-x-auto`}>
                  <code>{selectedProject.code}</code>
                </pre>
              ) : (
                <div className="text-center py-12">
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No code available for this project
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportProject && exportProject.code && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Project
                  </h3>
                  <p className="text-sm text-green-100 mt-1">{exportProject.name}</p>
                </div>
                <button
                  onClick={() => setExportProject(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Render the SimpleExportButton component here */}
            <div className="p-4">
              <SimpleExportButton
                projectId={exportProject.id}
                projectName={exportProject.name}
                projectCode={exportProject.code}
                projectType="nextjs"
                onSuccess={() => {
                  console.log('Export successful')
                  setExportProject(null)
                }}
                onError={(error) => console.error('Export error:', error)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
