'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileDashboardNavProps {
  userName?: string
  userEmail?: string
}

export default function MobileDashboardNav({ userName, userEmail }: MobileDashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Projects', href: '/dashboard/projects', icon: '🚀' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
    { name: 'Billing', href: '/billing', icon: '💳' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">BuildFlow</span>
          </Link>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
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

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-80 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {userName || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive(item.href)
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/api/auth/signout"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}