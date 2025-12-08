import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { HomePageSchema } from '@/components/JsonLd'
import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

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
  metadataBase: new URL('https://www.buildflow-ai.app'),
  title: {
    default: 'BuildFlow - AI-Powered App Builder',
    template: '%s | BuildFlow'
  },
  description: 'Build beautiful apps with AI. Create landing pages, web apps, and dashboards instantly. No coding required. Get production-ready React + Tailwind code in seconds.',
  keywords: [
    'AI app builder',
    'no-code',
    'low-code',
    'code generator',
    'AI coding assistant',
    'React generator',
    'Tailwind CSS',
    'landing page builder',
    'web app builder',
    'dashboard builder',
    'AI developer tools'
  ],
  authors: [{ name: 'BuildFlow Team', url: 'https://www.buildflow-ai.app' }],
  creator: 'BuildFlow',
  publisher: 'BuildFlow',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.buildflow-ai.app',
    siteName: 'BuildFlow',
    title: 'BuildFlow - AI-Powered App Builder',
    description: 'Build beautiful apps with AI. No coding required.',
    images: [
      {
        url: 'https://www.buildflow-ai.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BuildFlow - AI App Builder',
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
    description: 'Build beautiful apps with AI. No coding required.',
    images: ['https://www.buildflow-ai.app/og-image.png'],
  },
  
  // Icons - Using Next.js generated icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon',
    shortcut: '/favicon.ico',
  },
  
  // App manifest
  manifest: '/manifest.json',
  
  // Verification (replace with actual codes)
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
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
  applicationName: 'BuildFlow',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data */}
        <HomePageSchema />
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}