export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          There was a problem signing you in. Please try again.
        </p>
        <a
          href="/auth/signin"
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Sign In
        </a>
      </div>
    </div>
  );
}