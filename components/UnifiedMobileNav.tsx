'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface UnifiedMobileNavProps {
  userName?: string
  userEmail?: string
  currentProjectId?: string
  currentProjectName?: string
  isAdmin?: boolean
}

export default function UnifiedMobileNav({
  userName,
  userEmail,
  currentProjectId,
  currentProjectName,
  isAdmin = false
}: UnifiedMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const closeMenu = () => setIsOpen(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  const handleBack = () => {
    if (currentProjectId) {
      router.push(`/dashboard/projects/${currentProjectId}`)
    } else {
      router.push('/dashboard')
    }
  }

  // Determine if we're in a project context
  const isInProject = !!currentProjectId

  // Main menu items (when NOT in project)
  const mainMenuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', active: pathname === '/dashboard' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: '📈', active: pathname === '/dashboard/analytics' },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️', active: pathname === '/dashboard/settings' },
    { href: '/dashboard/billing', label: 'Billing', icon: '💳', active: pathname === '/dashboard/billing' },
  ]

  // Add admin link if user is admin
  if (isAdmin) {
    mainMenuItems.push({
      href: '/admin',
      label: 'Admin',
      icon: '🛡️',
      active: pathname.startsWith('/admin')
    })
  }

  // Project menu items (when IN project)
  const projectMenuItems = currentProjectId ? [
    { href: `/dashboard/projects/${currentProjectId}`, label: 'Overview', icon: '🏠', active: pathname === `/dashboard/projects/${currentProjectId}` },
    { href: `/chatbuilder/${currentProjectId}`, label: 'Chat Builder', icon: '💬', active: pathname === `/chatbuilder/${currentProjectId}` },
    { href: `/dashboard/projects/${currentProjectId}/pages`, label: 'Pages', icon: '📄', active: pathname.includes('/pages') },
    { href: `/dashboard/projects/${currentProjectId}/navigation`, label: 'Navigation', icon: '🧭', active: pathname.includes('/navigation') },
    { href: `/dashboard/projects/${currentProjectId}/seo`, label: 'SEO', icon: '🔍', active: pathname.includes('/seo') },
    { href: `/dashboard/projects/${currentProjectId}/submissions`, label: 'Submissions', icon: '📬', active: pathname.includes('/submissions') },
    { href: `/dashboard/projects/${currentProjectId}/domains`, label: 'Custom Domains', icon: '🌐', active: pathname.includes('/domains') },
  ] : []

  return (
    <>
      {/* Mobile Header - Only visible on mobile */}
      <header className="lg:hidden sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back button (if in project) or Logo */}
          <div className="flex items-center gap-3">
            {isInProject ? (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                aria-label="Back"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">BuildFlow</span>
              </Link>
            )}
          </div>

          {/* Center: Project name (if in project) */}
          {isInProject && currentProjectName && (
            <div className="flex-1 text-center px-2">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {currentProjectName}
              </h1>
            </div>
          )}

          {/* Right: Hamburger menu */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            aria-label="Menu"
          >
            {isOpen ? (
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Slide-in Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeMenu}
          />

          {/* Menu Panel */}
          <div className="lg:hidden fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-50 shadow-2xl overflow-y-auto">
            {/* User Info Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <button
                  onClick={closeMenu}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 className="font-bold text-lg">{userName || 'User'}</h2>
              <p className="text-sm text-white/80">{userEmail}</p>
            </div>

            {/* Menu Items */}
            <div className="p-4">
              {/* Project Menu (if in project) */}
              {isInProject && projectMenuItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                    Project
                  </h3>
                  <nav className="space-y-1">
                    {projectMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                          item.active
                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium hidden sm:inline">{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              )}

              {/* Main Menu */}
              <div className={isInProject ? 'border-t border-gray-200 dark:border-gray-700 pt-4' : ''}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                  Main Menu
                </h3>
                <nav className="space-y-1">
                  {mainMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        item.active
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium hidden sm:inline">{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Sign Out */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}