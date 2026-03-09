'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Github, ExternalLink, Loader2 } from 'lucide-react'

interface Props {
  projectId: string
}

export default function PushToGitHubButton({ projectId }: Props) {
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [repoUrl, setRepoUrl] = useState<string | null>(null)
  const [repoName, setRepoName] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [statusRes, ghRes] = await Promise.all([
          fetch('/api/integrations/github/status'),
          fetch(`/api/projects/${projectId}/github-status`),
        ])
        const [statusData, ghData] = await Promise.all([statusRes.json(), ghRes.json()])
        setConnected(!!statusData.connected)
        if (ghData.hasGithubRepo && ghData.deployment?.deploymentUrl) {
          setRepoUrl(ghData.deployment.deploymentUrl)
          setRepoName(ghData.deployment.deploymentId)
        }
      } catch {
        // fail silently — button will show "Connect GitHub" as fallback
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const handlePush = async () => {
    setPushing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/publish/github`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setRepoUrl(data.repoUrl)
        setRepoName(data.repoFullName)
        toast.success(
          data.isNew
            ? `Pushed to ${data.repoFullName}`
            : `Updated ${data.repoFullName}`
        )
      } else {
        toast.error(data.error || 'Failed to push to GitHub')
      }
    } catch {
      toast.error('Failed to push to GitHub')
    } finally {
      setPushing(false)
    }
  }

  if (loading) {
    return (
      <div className="h-9 w-36 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
    )
  }

  if (!connected) {
    return (
      <Link
        href="/integrations/github"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
      >
        <Github className="w-4 h-4" />
        Connect GitHub
      </Link>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handlePush}
        disabled={pushing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pushing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Github className="w-4 h-4" />
        )}
        {pushing ? 'Pushing...' : repoUrl ? 'Update GitHub repo' : 'Push to GitHub'}
      </button>

      {repoUrl && (
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={repoName ?? undefined}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View repo
        </a>
      )}
    </div>
  )
}
