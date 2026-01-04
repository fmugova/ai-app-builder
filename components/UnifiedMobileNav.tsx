'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface UnifiedMobileNavProps {
  userName?: string
  userEmail?: string
  isAdmin?: boolean
  currentProjectId?: string
  currentProjectName?: string
}

export default function UnifiedMobileNav({
  userName,
  userEmail,
  isAdmin = false,
  currentProjectId,
  currentProjectName
}: UnifiedMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Determine if we're in a project context
  const inProject = pathname?.includes('/projects/') && currentProjectId

  // Main navigation items
  const mainNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Projects', href: '/dashboard/projects', icon: '🚀' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
    { name: 'Billing', href: '/billing', icon: '💳' },
  ]

  // Admin item (only if user is admin)
  if (isAdmin) {
    mainNavItems.push({ name: 'Admin', href: '/admin', icon: '🛡️' })
  }

  // Project-specific items (only shown when in a project)
  const projectNavItems = currentProjectId ? [
    { name: 'Overview', href: `/dashboard/projects/${currentProjectId}`, icon: '📋' },
    { name: 'Chat Builder', href: `/chatbuilder/${currentProjectId}`, icon: '💬' },
    { name: 'Pages', href: `/dashboard/projects/${currentProjectId}/pages`, icon: '📄' },
    { name: 'Navigation', href: `/dashboard/projects/${currentProjectId}/navigation`, icon: '🧭' },
    { name: 'SEO', href: `/dashboard/projects/${currentProjectId}/seo`, icon: '🔍' },
    { name: 'Submissions', href: `/dashboard/projects/${currentProjectId}/submissions`, icon: '📬' },
  ] : []

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Header - Fixed at top */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo / Project Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {inProject && currentProjectName ? (
              <>
                <button
                  onClick={() => router.back()}
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition flex-shrink-0"
                  aria-label="Go back"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-gray-900 dark:text-white truncate text-sm">
                    {currentProjectName}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Project</p>
                </div>
              </>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white truncate">BuildFlow</span>
              </Link>
            )}
          </div>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-900 dark:text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-80 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } shadow-2xl`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {userName || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={closeMenu}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Project Navigation (if in project) */}
              {inProject && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">
                    Project
                  </h3>
                  <div className="space-y-1">
                    {projectNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                          isActive(item.href)
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium text-sm">{item.name}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-gray-800 my-4"></div>
                </div>
              )}

              {/* Main Navigation */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">
                  Main Menu
                </h3>
                <div className="space-y-1">
                  {mainNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        isActive(item.href)
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
            <button
              onClick={() => {
                closeMenu()
                signOut({ callbackUrl: '/' })
              }}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="lg:hidden h-14"></div>
    </>
  )
}