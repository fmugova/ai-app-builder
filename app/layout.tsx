import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://buildflow.app'),
  title: {
    default: 'BuildFlow - AI-Powered Code Generation | Create Web Apps Instantly',
    template: '%s | BuildFlow'
  },
  description: 'Generate production-ready React components, landing pages, and web apps in seconds using AI. No coding required. Try BuildFlow free today.',
  keywords: [
    'AI code generator',
    'React component generator',
    'landing page builder',
    'no-code platform',
    'web app builder',
    'AI development tool',
    'Claude AI',
    'code automation',
    'rapid prototyping'
  ],
  authors: [{ name: 'BuildFlow' }],
  creator: 'BuildFlow',
  publisher: 'BuildFlow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://buildflow.app',
    siteName: 'BuildFlow',
    title: 'BuildFlow - AI-Powered Code Generation',
    description: 'Generate production-ready code in seconds with AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BuildFlow - AI Code Generator'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuildFlow - AI-Powered Code Generation',
    description: 'Generate production-ready code in seconds',
    images: ['/og-image.png'],
    creator: '@buildflow'
  },
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
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  }
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
      </body>
    </html>
  )
}