export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-8 w-28 bg-gray-800 rounded mb-8" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 space-y-3">
              <div className="h-5 w-40 bg-gray-700 rounded" />
              <div className="h-10 bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
