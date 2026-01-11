// Protected Route Components and Session Hooks

export const PROTECTED_COMPONENTS = {
  // Protected Route Wrapper (Client Component)
  protectedRoute: {
    name: 'Protected Route Wrapper',
    path: 'components/ProtectedRoute.tsx',
    content: `'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
`
  },

  // Session Provider Wrapper
  sessionProvider: {
    name: 'Session Provider',
    path: 'components/SessionProvider.tsx',
    content: `'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export default function SessionProvider({
  children
}: {
  children: React.ReactNode
}) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
`
  },

  // useAuth Hook
  useAuthHook: {
    name: 'useAuth Hook',
    path: 'hooks/useAuth.ts',
    content: `import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  // Redirect if authentication is required but user is not authenticated
  if (requireAuth && !isLoading && !isAuthenticated) {
    router.push('/auth/login')
  }

  return {
    user: session?.user,
    session,
    isLoading,
    isAuthenticated,
    isUnauthenticated: status === 'unauthenticated'
  }
}
`
  },

  // Middleware for Server-Side Protection
  middleware: {
    name: 'Auth Middleware',
    path: 'middleware.ts',
    content: `import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Additional logic can go here
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

// Specify which routes to protect
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/api/user/:path*'
  ]
}
`
  },

  // Role-Based Access Control Component
  requireRole: {
    name: 'Role-Based Access',
    path: 'components/RequireRole.tsx',
    content: `'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RequireRoleProps {
  children: React.ReactNode
  roles: string[]
  fallback?: React.ReactNode
}

export default function RequireRole({ 
  children, 
  roles,
  fallback 
}: RequireRoleProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const hasRequiredRole = session?.user?.role && roles.includes(session.user.role)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to view this page.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
`
  },

  // Loading Component
  authLoading: {
    name: 'Auth Loading Component',
    path: 'components/AuthLoading.tsx',
    content: `export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}
`
  },

  // Root Layout with Session Provider
  rootLayout: {
    name: 'Root Layout with Auth',
    path: 'app/layout.tsx',
    content: `import SessionProvider from '@/components/SessionProvider'
import './globals.css'

export const metadata = {
  title: 'My App',
  description: 'Built with authentication'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
`
  },

  // Example Protected Dashboard
  dashboardExample: {
    name: 'Protected Dashboard Example',
    path: 'app/dashboard/page.tsx',
    content: `'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  Welcome, {user?.name}!
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Total Users
              </h3>
              <p className="text-3xl font-bold text-blue-600">1,234</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Active Projects
              </h3>
              <p className="text-3xl font-bold text-green-600">56</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Revenue
              </h3>
              <p className="text-3xl font-bold text-purple-600">$12.5K</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Activity
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Your protected dashboard content goes here...
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
`
  }
}
