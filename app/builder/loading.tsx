export default function BuilderLoading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4">
        <div className="h-5 w-28 bg-gray-700 rounded" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-gray-700 rounded-lg" />
        <div className="h-8 w-20 bg-gray-700 rounded-lg" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-40 bg-gray-800 rounded-xl" />
          <div className="h-10 bg-gray-800 rounded-xl" />
          <div className="h-10 bg-purple-900/40 rounded-xl" />
        </div>
        <div className="h-96 bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}
