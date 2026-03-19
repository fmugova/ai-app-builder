export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-8 w-32 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-800 rounded mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-800 rounded-xl border border-gray-700" />
          ))}
        </div>
      </div>
    </div>
  )
}
