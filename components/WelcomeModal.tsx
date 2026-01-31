'use client'

import { useState } from 'react'  // ✅ Removed useEffect
import { X, Sparkles, BookOpen, Code } from 'lucide-react'
import Link from 'next/link'

export default function WelcomeModal() {
  // Initialize state based on localStorage to avoid setState in effect
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      return !hasSeenWelcome
    }
    return false
  })
  
  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true')
    setIsOpen(false)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-8 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Welcome to BuildFlow AI!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Transform ideas into production-ready apps in seconds
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/tutorial"
            onClick={handleClose}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition text-center"
          >
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold mb-1">Read Tutorial</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Learn the P.F.D.A. framework
            </p>
          </Link>
          
          <Link
            href="/examples"
            onClick={handleClose}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition text-center"
          >
            <Code className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold mb-1">Browse Examples</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              30+ ready-to-use prompts
            </p>
          </Link>
          
          <button
            onClick={handleClose}
            className="p-4 border-2 border-purple-600 dark:border-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition text-center"
          >
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold mb-1">Start Building</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Jump right in!
            </p>
          </button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Pro Tip:</strong> The more specific your prompt, the better your results. 
            Use the <strong>Prompt Assistant</strong> button for guided help!
          </p>
        </div>
      </div>
    </div>
  )
}
