'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import type { Project } from '@/types/project'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { ProjectListSkeleton, QuickActionsSkeleton } from '@/components/LoadingSkeleton'
import StatsCards from '@/components/DashboardStatsCards'

// Lazy load heavy components
const ProjectList = dynamic(() => import('@/components/DashboardProjectList'), {
  loading: () => <ProjectListSkeleton />,
  ssr: false
})

const QuickActions = dynamic(() => import('@/components/DashboardQuickActions'), {
  loading: () => <QuickActionsSkeleton />,
  ssr: false
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
  initialProjects = [],
  stats,
  userName,
  userEmail,
  isAdmin = false,
}: DashboardClientProps) {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>(initialProjects || [])
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark'
    }
    return true
  })
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast notification system
  const toastIdRef = React.useRef(0)
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    toastIdRef.current += 1
    const id = toastIdRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
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

  const { data: session } = useSession()

  if (!session) return null

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
            <Link href="/" className="text-2xl font-bold text-white">
              BuildFlow
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/workspaces" className="px-4 py-2 text-gray-300 hover:text-white text-sm flex items-center gap-2">
                👥 Workspaces
              </Link>
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
              {/* Desktop Account Menu */}
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
                          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-gray-700 text-sm"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards - Keep light and server-side */}
        <StatsCards stats={stats} isDarkMode={isDarkMode} />

        {/* Quick Actions - Lazy loaded */}
        <Suspense fallback={<QuickActionsSkeleton isDarkMode={isDarkMode} />}>
          <QuickActions isDarkMode={isDarkMode} hasProjects={projects.length > 0} />
        </Suspense>

        {/* Projects Section - Lazy loaded */}
        <Suspense fallback={<ProjectListSkeleton isDarkMode={isDarkMode} />}>
          <ProjectList
            initialProjects={projects}
            isDarkMode={isDarkMode}
            onDelete={handleDeleteProject}
            onRefresh={() => window.location.reload()}
          />
        </Suspense>
      </div>

      {/* CSS for animations */}
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
