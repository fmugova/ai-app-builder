'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GitHubExportButton({ projectId }: { projectId: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGitHubExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      // First, check if GitHub is connected
      const checkResponse = await fetch('/api/user/github-status');
      const { connected } = await checkResponse.json();

      if (!connected) {
        // Redirect to GitHub OAuth
        window.location.href = `/api/auth/github?projectId=${projectId}`;
        return;
      }

      // If connected, proceed with export
      const exportResponse = await fetch('/api/export/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await exportResponse.json();

      if (!exportResponse.ok) {
        throw new Error(data.error || 'Export failed');
      }

      // Success - show repo URL
      alert(`Repository created: ${data.repoUrl}`);
      
      // Store repo name for deployment
      return data.repoName;
      
    } catch (err: any) {
      console.error('GitHub export error:', err);
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGitHubExport}
        disabled={isExporting}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Export to GitHub'}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
