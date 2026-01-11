'use client'

interface QuickActionsProps {
  isDarkMode: boolean
  hasProjects: boolean
}

export default function QuickActions({ isDarkMode, hasProjects }: QuickActionsProps) {
  if (!hasProjects) {
    return null
  }

  return (
    <div className={`mb-8 ${isDarkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'} rounded-2xl p-6 border`}>
      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
        🚀 Multi-Page Project Tools
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">📄</span>
            </div>
            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pages Manager</h4>
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
            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Navigation</h4>
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
            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>SEO</h4>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Optimize for search engines
          </p>
        </div>
      </div>
    </div>
  )
}
