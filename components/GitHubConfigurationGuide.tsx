'use client';

import { useEffect, useState } from 'react';
import { Github, Key, GitBranch, FileCode, AlertCircle, Check } from 'lucide-react';

export default function GitHubConfigurationGuide() {
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
    <div className="space-y-8">
      {/* Connection Status Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
            <Github className="w-8 h-8 text-gray-900 dark:text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              GitHub Integration Status
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {connected 
                ? `Connected as @${username}` 
                : 'Connect your GitHub account to enable project exports'}
            </p>
          </div>
          {!loading && !connected && (
            <button
              onClick={handleConnect}
              className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 whitespace-nowrap"
            >
              <Github className="w-5 h-5" />
              Connect Now
            </button>
          )}
          {connected && (
            <div className="text-center">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-lg mb-2">
                <Check className="w-6 h-6" />
                Ready
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Setup Steps */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          How to Use GitHub Integration
        </h3>
        
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">1</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connect Your GitHub Account
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Click the "Connect Now" button above to authorize BuildFlow with your GitHub account. You'll be redirected to GitHub to approve the connection.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-900 dark:text-blue-200">
                  ℹ️ We request permission to create and manage repositories on your behalf.
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">2</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Generate or Edit Your Project
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a new project or edit an existing one using the BuildFlow builder. Once you're happy with the code, proceed to export it.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">3</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Export to GitHub
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Click the "Export" button in the preview or builder. Choose "Export to GitHub" and follow the prompts to create a new repository.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <GitBranch className="w-4 h-4" />
                    <span>A new repository will be created with your project name</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <FileCode className="w-4 h-4" />
                    <span>All code, README, and dependencies will be included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">4</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Deploy with Vercel (Optional)
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  After exporting to GitHub, you can connect your repository to Vercel for automatic deployments. Every push to main will trigger a deployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Frequently Asked Questions
        </h3>
        
        <div className="space-y-4">
          <details className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 group">
            <summary className="flex cursor-pointer items-center gap-3 font-semibold text-gray-900 dark:text-white">
              <span className="text-indigo-600 dark:text-indigo-400">?</span>
              Is my GitHub token secure?
            </summary>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Yes. Your GitHub token is encrypted and stored securely in our database. We only use it to create repositories and push code on your behalf. The token is never shared or logged.
            </p>
          </details>

          <details className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 group">
            <summary className="flex cursor-pointer items-center gap-3 font-semibold text-gray-900 dark:text-white">
              <span className="text-indigo-600 dark:text-indigo-400">?</span>
              Can I revoke GitHub access?
            </summary>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Yes. You can disconnect your GitHub account at any time from your settings. You can also revoke access directly from your GitHub account settings under "Connected applications".
            </p>
          </details>

          <details className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 group">
            <summary className="flex cursor-pointer items-center gap-3 font-semibold text-gray-900 dark:text-white">
              <span className="text-indigo-600 dark:text-indigo-400">?</span>
              What permissions does BuildFlow request?
            </summary>
            <p className="mt-3 text-gray-600 dark:text-gray-400 mb-2">
              We request the following permissions:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>Create and manage repositories</li>
              <li>Push code and commits</li>
              <li>Read your public profile information</li>
            </ul>
          </details>

          <details className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 group">
            <summary className="flex cursor-pointer items-center gap-3 font-semibold text-gray-900 dark:text-white">
              <span className="text-indigo-600 dark:text-indigo-400">?</span>
              Can I export to an existing repository?
            </summary>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Currently, exports create new repositories. If you need to push to an existing repository, you can download the code and push it manually using Git.
            </p>
          </details>
        </div>
      </div>

      {/* Warning */}
      {!loading && !connected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
              GitHub connection required
            </h4>
            <p className="text-amber-800 dark:text-amber-300">
              You need to connect your GitHub account to export projects. This is a one-time setup that takes less than a minute.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
