export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="h-8 w-40 bg-gray-800 rounded mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}
