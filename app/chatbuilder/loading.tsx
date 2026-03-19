export default function ChatbuilderLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar skeleton */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4 animate-pulse">
        <div className="h-5 w-32 bg-gray-700 rounded" />
        <div className="flex-1" />
        <div className="h-8 w-24 bg-gray-700 rounded-lg" />
        <div className="h-8 w-24 bg-gray-700 rounded-lg" />
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel skeleton */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
            <div className="h-6 w-40 bg-gray-700 rounded mb-4" />
            {/* Template buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-9 bg-gray-800 rounded-lg" />
              ))}
            </div>
            {/* Textarea */}
            <div className="h-36 bg-gray-800 rounded-lg mb-4" />
            <div className="h-10 bg-purple-900/40 rounded-lg" />
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
          <div className="flex gap-4 mb-6">
            <div className="h-8 w-20 bg-gray-700 rounded-lg" />
            <div className="h-8 w-20 bg-gray-700 rounded-lg" />
          </div>
          <div className="h-96 bg-gray-800 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
