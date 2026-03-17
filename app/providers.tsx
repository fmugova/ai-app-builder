'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import PostHogProvider from '@/components/providers/PostHogProvider'

// NOTE: 'next-auth/react' is aliased to lib/next-auth-react-shim.tsx in
// next.config.ts (both turbopack.resolveAlias and webpack resolve.alias).
// That shim provides SessionProvider and useSession using app-bundled React,
// preventing the null-dispatcher SSR crash caused by next-auth being a
// serverExternalPackage (which gives it its own separate React instance).

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <PostHogProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </PostHogProvider>
    </SessionProvider>
  )
}
