'use client'

import Link from 'next/link'

interface QuickActionsProps {
  isDarkMode: boolean
  hasProjects: boolean
}

export default function DashboardQuickActions({ isDarkMode, hasProjects }: QuickActionsProps) {
  return (
    <>
      {/* Builder Navigation - Chat vs Traditional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link 
          href="/builder" 
          className={`p-6 border rounded-xl hover:shadow-lg transition ${
            isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Traditional Builder
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Your current workflow
          </p>
        </Link>
        
        <Link 
          href="/chatbuilder" 
          className={`p-6 border rounded-xl hover:shadow-lg transition ${
            isDarkMode 
              ? 'bg-blue-900/30 border-blue-800 hover:border-blue-700' 
              : 'bg-blue-50 border-blue-200 hover:border-blue-300'
          }`}
        >
          <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Chat Builder <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-2">NEW</span>
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>
            Upload files • Iterate with AI
          </p>
        </Link>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* New Project */}
        <Link 
          href="/builder"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition group shadow-lg hover:shadow-xl"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
            <span className="text-2xl">✨</span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-white">New Project</p>
            <p className="text-xs text-white/80">Create with AI</p>
          </div>
        </Link>

        {/* Templates - NEW! */}
        <Link 
          href="/templates"
          className={`flex items-center gap-3 p-4 rounded-xl transition group shadow-md hover:shadow-lg ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
              : 'bg-white hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${
            isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'
          }`}>
            <span className="text-2xl">📋</span>
          </div>
          <div className="text-left">
            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Templates
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Browse marketplace
            </p>
          </div>
        </Link>

        {/* Tutorial */}
        <Link 
          href="/tutorial"
          className={`flex items-center gap-3 p-4 rounded-xl transition group shadow-md hover:shadow-lg ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
              : 'bg-white hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <span className="text-2xl">💡</span>
          </div>
          <div className="text-left">
            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Tutorial
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Learn the basics
            </p>
          </div>
        </Link>

        {/* Get Help */}
        <Link 
          href="/contact"
          className={`flex items-center gap-3 p-4 rounded-xl transition group shadow-md hover:shadow-lg ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
              : 'bg-white hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <span className="text-2xl">💬</span>
          </div>
          <div className="text-left">
            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Get Help
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Email support
            </p>
          </div>
        </Link>
      </div>

      {/* Multi-Page Features Banner - Only show if user has projects */}
      {hasProjects && (
        <div className={`mb-8 rounded-2xl p-6 border shadow-lg ${
          isDarkMode 
            ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-800' 
            : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
        }`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🚀 Multi-Page Project Tools
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📄</span>
                </div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Pages Manager
                </h4>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create and organize multiple pages
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🧭</span>
                </div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Navigation
                </h4>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Design site navigation
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  SEO
                </h4>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Optimize for search engines
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}