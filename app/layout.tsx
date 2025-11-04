import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI App Builder - Build Apps with AI',
  description: 'Create beautiful web apps and websites using AI in seconds',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
