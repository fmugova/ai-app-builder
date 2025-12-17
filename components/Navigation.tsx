"use client"

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu, X, Home, FolderOpen, User, Mail, LogOut, 
  CreditCard, Shield, Sun, Moon
} from 'lucide-react'

interface NavigationProps {
  variant?: 'landing' | 'dashboard'
}

export function Navigation({ variant = 'dashboard' }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      if (session?.user?.email && status === 'authenticated') {
        try {
          setIsLoading(true)
          const res = await fetch('/api/user/role', {
            cache: 'no-store'
          })
          if (res.ok) {
            const data = await res.json()
            setIsAdmin(data.role === 'admin')
          }
        } catch (error) {
          console.error('Failed to check admin status:', error)
          setIsAdmin(false)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsAdmin(false)
        setIsLoading(false)
      }
    }
    checkAdmin()
  }, [session, status])

  // Dark mode toggle
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', String(newMode))
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const isActive = (path: string) => pathname === path
  const closeMenu = () => setIsOpen(false)

  // Landing page navigation
  if (variant === 'landing') {
    return (
      <>
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/pricing" className="px-4 py-2 text-gray-300 hover:text-white transition">
            Pricing
          </Link>
          <Link href="/contact" className="px-4 py-2 text-gray-300 hover:text-white transition">
            Contact
          </Link>
          
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-300 hover:text-white transition rounded-lg hover:bg-gray-800"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {status === 'authenticated' ? (
            <>
              <Link href="/dashboard" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 text-red-400 hover:text-red-300 transition"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="px-4 py-2 text-gray-300 hover:text-white transition">
                Sign In
              </Link>
              <Link href="/auth/signin" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button and drawer - same pattern */}
        <button 
          onClick={() => setIsOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMenu} />
            <div className="fixed right-0 top-0 h-full w-72 bg-gray-900 z-50 p-6 overflow-y-auto lg:hidden">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button onClick={closeMenu} className="p-2 hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => {
                    toggleDarkMode()
                    closeMenu()
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <Link href="/pricing" onClick={closeMenu} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white">
                  <CreditCard className="w-5 h-5" />
                  <span>Pricing</span>
                </Link>
                <Link href="/contact" onClick={closeMenu} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white">
                  <Mail className="w-5 h-5" />
                  <span>Contact</span>
                </Link>

                {status === 'authenticated' ? (
                  <>
                    <div className="my-4 border-t border-gray-700" />
                    <Link href="/dashboard" onClick={closeMenu} className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-white font-medium">
                      <Home className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        closeMenu()
                        signOut({ callbackUrl: '/' })
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="my-4 border-t border-gray-700" />
                    <Link href="/auth/signin" onClick={closeMenu} className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-white font-medium">
                      <span>Get Started</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </>
        )}
      </>
    )
  }

  // Dashboard navigation
  return (
    <>
      <div className="hidden lg:flex items-center gap-3">
        <Link 
          href="/dashboard"
          className={`px-4 py-2 rounded-lg transition ${
            isActive('/dashboard') 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
        >
          Dashboard
        </Link>
        <Link 
          href="/projects"
          className={`px-4 py-2 rounded-lg transition ${
            isActive('/projects') 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
        >
          Projects
        </Link>
        <Link 
          href="/account"
          className={`px-4 py-2 rounded-lg transition ${
            isActive('/account') 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
        >
          Account
        </Link>
        
        {!isLoading && isAdmin && (
          <Link 
            href="/admin"
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              isActive('/admin') 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </Link>
        )}

        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-300 hover:text-white transition rounded-lg hover:bg-gray-800"
          title="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <Link 
          href="/contact"
          className="px-4 py-2 text-blue-400 hover:text-blue-300 transition"
        >
          Support
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-4 py-2 text-red-400 hover:text-red-300 transition"
        >
          Sign Out
        </button>
      </div>

      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMenu} />
          <div className="fixed right-0 top-0 h-full w-72 bg-gray-900 z-50 p-6 overflow-y-auto lg:hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button onClick={closeMenu} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => {
                  toggleDarkMode()
                  closeMenu()
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <div className="my-4 border-t border-gray-700" />

              <Link 
                href="/dashboard"
                onClick={closeMenu}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/projects"
                onClick={closeMenu}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <FolderOpen className="w-5 h-5" />
                <span>My Projects</span>
              </Link>
              <Link 
                href="/account"
                onClick={closeMenu}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-white"
              >
                <User className="w-5 h-5" />
                <span>Account</span>
              </Link>

              {!isLoading && isAdmin && (
                <>
                  <div className="my-4 border-t border-gray-700" />
                  <Link 
                    href="/admin"
                    onClick={closeMenu}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 transition text-yellow-400"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Admin Panel</span>
                  </Link>
                </>
              )}

              <div className="my-4 border-t border-gray-700" />

              <Link 
                href="/contact"
                onClick={closeMenu}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-blue-400"
              >
                <Mail className="w-5 h-5" />
                <span>Contact Support</span>
              </Link>

              <div className="my-4 border-t border-gray-700" />

              <button
                onClick={() => {
                  closeMenu()
                  signOut({ callbackUrl: '/' })
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  )
}