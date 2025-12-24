'use client';

import { useEffect, useState } from 'react';
import { Github, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function GitHubIntegrationCard() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/user/github-status');
        const data = await res.json();
        setConnected(data.connected);
        setUsername(data.username);
      } catch (error) {
        console.error('Failed to check GitHub status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/auth/github';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Github className="w-8 h-8 text-gray-900 dark:text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            GitHub Integration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect your GitHub account to export projects directly to your repositories
          </p>
        </div>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : connected ? (
          <div className="text-right">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium mb-1">
              <Check className="w-5 h-5" />
              Connected
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {username}
            </p>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            Connect
          </button>
        )}
      </div>

      {!loading && !connected && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Not connected</p>
            <p className="text-amber-700 dark:text-amber-300">
              Connect your GitHub account to enable direct exports and deployments from your projects.
            </p>
          </div>
        </div>
      )}

      {!loading && connected && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ You can now export projects to your GitHub repositories
          </p>
        </div>
      )}
    </div>
  );
}
