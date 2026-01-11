interface StatsCardsProps {
  stats: {
    projectsThisMonth: number
    projectsLimit: number
    generationsUsed: number
    generationsLimit: number
    subscriptionTier: string
    subscriptionStatus: string
  }
  isDarkMode: boolean
}

export default function StatsCards({ stats, isDarkMode }: StatsCardsProps) {
  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'from-purple-500 to-pink-500'
      case 'business': return 'from-blue-500 to-cyan-500'
      case 'pro': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const projectsPercentage = getUsagePercentage(stats.projectsThisMonth, stats.projectsLimit)
  const generationsPercentage = getUsagePercentage(stats.generationsUsed, stats.generationsLimit)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Projects Usage */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Projects This Month</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {stats.projectsThisMonth}/{stats.projectsLimit}
          </span>
        </div>
        <div className="mb-2">
          <div className={`h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${getUsageColor(projectsPercentage)} transition-all duration-500`}
              style={{ width: `${projectsPercentage}%` }}
            />
          </div>
        </div>
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {stats.projectsLimit - stats.projectsThisMonth} remaining
        </p>
      </div>

      {/* Generations Usage */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Generations</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {stats.generationsUsed}/{stats.generationsLimit}
          </span>
        </div>
        <div className="mb-2">
          <div className={`h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${getUsageColor(generationsPercentage)} transition-all duration-500`}
              style={{ width: `${generationsPercentage}%` }}
            />
          </div>
        </div>
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {stats.generationsLimit - stats.generationsUsed} remaining
        </p>
      </div>

      {/* Subscription Status */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Subscription</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${
            stats.subscriptionStatus === 'active' 
              ? 'bg-green-900/30 text-green-400 border border-green-700' 
              : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
          }`}>
            {stats.subscriptionStatus}
          </span>
        </div>
        <div className={`inline-block px-3 py-1.5 rounded-full bg-gradient-to-r ${getTierColor(stats.subscriptionTier)} text-white text-sm font-medium mb-2`}>
          {stats.subscriptionTier.charAt(0).toUpperCase() + stats.subscriptionTier.slice(1)} Plan
        </div>
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          All features included
        </p>
      </div>
    </div>
  )
}
