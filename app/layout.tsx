import './globals.css'
import UnifiedMobileNav from '@/components/UnifiedMobileNav'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkIfAdmin } from '@/lib/admin-check'
import { Inter } from 'next/font/google'
import Providers from './providers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { HomePageSchema } from '@/components/JsonLd'
import SupportChat from '@/components/SupportChat'
import FeedbackWidget from '@/components/FeedbackWidget'
import CSPMonitor from '@/components/CSPMonitor'
import type { Metadata, Viewport } from 'next'


// Optimize Inter font loading
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Show fallback font immediately, swap when loaded
  preload: false, // Disable preload to avoid unused preload warnings
  variable: '--font-inter', // CSS variable for the font
  weight: ['400', '500', '600', '700'], // Only load weights we actually use
})

// Safe URL resolution
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.split(',')[0].trim();
  }
  return 'http://localhost:3000';
}

// Viewport configuration (theme-color, etc.)
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark light',
}

export const metadata: Metadata = {
    other: {
      'mobile-web-app-capable': 'yes',
    },
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: 'BuildFlow - AI-Powered App Builder',
    template: '%s | BuildFlow'
  },
  description: 'Generate production-ready React components and web apps in seconds. Create landing pages, dashboards, portfolios, and more with AI. No coding required.',
  keywords: [
    'AI app builder',
    'no-code',
    'low-code',
    'code generator',
    'AI coding assistant',
    'React generator',
    'React components',
    'Tailwind CSS',
    'landing page builder',
    'web app builder',
    'web app generator',
    'dashboard builder',
    'AI code generation',
    'AI developer tools'
  ],
  authors: [{ name: 'BuildFlow', url: 'https://www.buildflow-ai.app' }],
  creator: 'BuildFlow',
  publisher: 'BuildFlow',
  
  // Open Graph (Facebook, LinkedIn)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.buildflow-ai.app',
    siteName: 'BuildFlow',
    title: 'BuildFlow - AI-Powered App Builder',
    description: 'Generate production-ready React components and web apps in seconds. Create landing pages, dashboards, portfolios, and more with AI. No coding required.',
    images: [
      {
        url: 'https://www.buildflow-ai.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BuildFlow - AI-Powered App Builder',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: '@buildflow',
    creator: '@buildflow',
    title: 'BuildFlow - AI-Powered App Builder',
    description: 'Generate production-ready React components and web apps in seconds. No coding required.',
    images: ['https://www.buildflow-ai.app/og-image.png'],
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  
  // App manifest
  manifest: '/site.webmanifest',
  
  // App/PWA Meta
  applicationName: 'BuildFlow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BuildFlow',
  },
  
  // Verification — replace with actual code from Google Search Console
  // See: https://search.google.com/search-console → Settings → Ownership verification
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Canonical URL
  alternates: {
    canonical: 'https://www.buildflow-ai.app',
  },
  
  // Categories
  category: 'technology',
  
  // Additional meta
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Wrap in try/catch: JWEDecryptionFailed (stale cookie after secret rotation)
  // must not crash the entire layout — just treat as unauthenticated
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Invalid/expired JWT — user will be signed out on next interaction
  }

  // Check if user is admin with error handling
  let isAdmin = false
  try {
    isAdmin = session?.user?.email ? await checkIfAdmin(session.user.email) : false
  } catch (error) {
    console.error('[Layout] Error checking admin status:', error)
    isAdmin = false
  }

  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data */}
        <HomePageSchema />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {session && (
          <UnifiedMobileNav
            userName={session.user?.name || undefined}
            userEmail={session.user?.email || undefined}
            isAdmin={isAdmin}
          />
        )}
        <main className="pt-16">
          <Providers>{children}</Providers>
        </main>
        {/* Only load Vercel Analytics and SpeedInsights in production */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
        <GoogleAnalytics gaId="GTM-KNTK3Z8G" />
        <GoogleTagManager gtmId="GTM-KNTK3Z8G" />
        <SupportChat />
        <FeedbackWidget />
        <CSPMonitor />

      </body>
    </html>
  )
}
