'use client';

export default function TestGitHubButton() {
  const handleGitHubClick = () => {
    console.log('🚀 Starting GitHub OAuth flow...');
    console.log('Redirect URL:', '/api/auth/github?projectId=test');
    window.location.href = '/api/auth/github?projectId=test';
  };

  return (
    <button
      onClick={handleGitHubClick}
      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
    >
      Test GitHub Connection
    </button>
  );
}
