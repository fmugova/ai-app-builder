export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header Skeleton */}
      <header className="bg-gray-800/95 border-b border-gray-700 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-700 rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-gray-700 rounded" />
                <div className="h-3 w-20 bg-gray-700 rounded" />
              </div>
            </div>
            <div className="flex gap-3 animate-pulse">
              <div className="w-20 h-9 bg-gray-700 rounded-lg" />
              <div className="w-24 h-9 bg-gray-700 rounded-lg" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-64 bg-gray-800 rounded mb-2" />
          <div className="h-4 w-96 bg-gray-800 rounded" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-gray-700 rounded" />
                  <div className="h-6 w-20 bg-gray-700 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-700 rounded-full" />
                <div className="h-3 w-24 bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-700 rounded" />
                  <div className="h-3 w-20 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Projects Section Skeleton */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6 animate-pulse">
            <div className="space-y-2">
              <div className="h-6 w-32 bg-gray-700 rounded" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="w-48 h-10 bg-gray-700 rounded-lg" />
              <div className="w-32 h-10 bg-gray-700 rounded-lg" />
            </div>
          </div>

          {/* Projects Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden animate-pulse">
                <div className="h-2 bg-gray-700" />
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 bg-gray-700 rounded-xl" />
                    <div className="h-6 w-16 bg-gray-700 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-5 w-3/4 bg-gray-700 rounded" />
                    <div className="h-4 w-full bg-gray-700 rounded" />
                    <div className="h-4 w-5/6 bg-gray-700 rounded" />
                  </div>
                  <div className="space-y-2 pt-4">
                    <div className="flex gap-2">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="flex-1 h-9 bg-gray-700 rounded-lg" />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="flex-1 h-9 bg-gray-700 rounded-lg" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}