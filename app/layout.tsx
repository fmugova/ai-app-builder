import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://buildflow.app'),
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
  authors: [{ name: 'BuildFlow Team', url: 'https://buildflow.app' }],
  creator: 'BuildFlow',
  publisher: 'BuildFlow',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://buildflow.app',
    siteName: 'BuildFlow',
    title: 'BuildFlow - AI-Powered App Builder',
    description: 'Build beautiful apps with AI. No coding required.',
    images: [
      {
        url: '/og-image.png',
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
    images: ['/og-image.png'],
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  
  // Verification
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
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
  
  // ✅ Enhanced Alternates with mobile/desktop variants
  alternates: {
    canonical: 'https://buildflow.app',
    languages: {
      'en-US': 'https://buildflow.app',
      'en-GB': 'https://buildflow.app/en-gb',
      'es-ES': 'https://buildflow.app/es',
      'fr-FR': 'https://buildflow.app/fr',
      'de-DE': 'https://buildflow.app/de',
      'x-default': 'https://buildflow.app', // Fallback for other languages
    },
    media: {
      'only screen and (max-width: 600px)': 'https://m.buildflow.app',
    },
    types: {
      'application/rss+xml': 'https://buildflow.app/rss.xml',
      'application/atom+xml': 'https://buildflow.app/atom.xml',
    },
  },
  
  // Categories
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}