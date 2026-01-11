// components/LoadingSkeleton.tsx
// Skeleton loading states for better UX

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  )
}

export function ApiEndpointsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-12 bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900 dark:to-blue-900 rounded-xl"></div>
      
      {/* Endpoint cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-32 bg-gray-900 rounded-lg"></div>
        </div>
      ))}
    </div>
  )
}

export function EnvironmentVariablesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      
      {/* Variable rows */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full animate-pulse">
      {/* Table header */}
      <div className="grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4 p-4 border-b border-gray-100 dark:border-gray-800" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
      <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-64 animate-pulse">
      <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-lg flex items-end justify-around gap-2 p-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div 
            key={i} 
            className="bg-gray-300 dark:bg-gray-600 rounded-t w-full"
            style={{ height: `${40 + (i * 8.57)}%` }}
          ></div>
        ))}
      </div>
    </div>
  )
}

export function NavigationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      
      {/* Navigation items */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SEOSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Score circle */}
      <div className="flex justify-center">
        <div className="h-32 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      
      {/* SEO fields */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

export function PageListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <ChartSkeleton />
      
      {/* Table */}
      <TableSkeleton rows={5} columns={3} />
    </div>
  )
}

export function CodeEditorSkeleton() {
  return (
    <div className="w-full h-96 bg-gray-900 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
        <p>Loading code editor...</p>
      </div>
    </div>
  )
}

export function ProjectListSkeleton({ isDarkMode = true }: { isDarkMode?: boolean }) {
  return (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border animate-pulse`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuickActionsSkeleton({ isDarkMode = true }: { isDarkMode?: boolean }) {
  return (
    <div className={`mb-8 ${isDarkMode ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-200'} rounded-2xl p-6 border animate-pulse`}>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WorkspaceSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-pulse">
      {/* Back button */}
      <div className="mb-6">
        <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        
        {/* Content area */}
        <div className="space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Export everything as default for easy importing
const LoadingSkeletons = {
  DashboardSkeleton,
  ProjectCardSkeleton,
  ApiEndpointsSkeleton,
  EnvironmentVariablesSkeleton,
  TableSkeleton,
  FormSkeleton,
  ChartSkeleton,
  NavigationSkeleton,
  SEOSkeleton,
  PageListSkeleton,
  AnalyticsSkeleton,
  CodeEditorSkeleton,
  WorkspaceSkeleton,
  ProjectListSkeleton,
  QuickActionsSkeleton,
}

export default LoadingSkeletons
