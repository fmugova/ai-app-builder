
"use client"
import { useState } from 'react'
import { MobileMenu } from '@/components/MobileMenu'
import { Monitor, Tablet, Smartphone, RefreshCw, Code, X } from 'lucide-react'

export default function PreviewPage() {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showCode, setShowCode] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-white font-semibold">Project Preview</h1>

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'desktop' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('tablet')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'tablet' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Tablet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'mobile' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white rounded-lg transition">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowCode(!showCode)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition"
            >
              <Code className="w-5 h-5" />
            </button>
            <button className="p-2 text-red-400 hover:text-red-300 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Hamburger */}
          <div className="lg:hidden">
            <MobileMenu 
              onViewChange={setViewMode}
              onRefresh={() => window.location.reload()}
              onViewCode={() => setShowCode(!showCode)}
            />
          </div>
        </div>
      </header>

      {/* Preview Content */}
      <main className="p-4">
        {/* Your preview iframe here */}
      </main>
    </div>
  )
}