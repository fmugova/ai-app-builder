import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100 text-center">
        <div className="mb-6">
          <p className="text-8xl font-bold text-purple-600 leading-none">404</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Page not found</h1>
          <p className="text-gray-500 text-sm mt-2">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full text-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="block w-full text-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
