"use client"

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu, X, Home, FolderOpen, User, Mail, LogOut, Plus, CreditCard
} from 'lucide-react'

interface NavigationProps {
  variant?: 'landing' | 'dashboard'
}

export function Navigation({ variant = 'dashboard' }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

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
        <Link 
          href="/builder"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
        >
          + New Project
        </Link>
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
              <Link 
                href="/builder"
                onClick={closeMenu}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-white font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </Link>

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