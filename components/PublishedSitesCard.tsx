'use client'

import { useState } from 'react'
import { ExternalLink, Copy, CheckCheck, EyeOff, Globe, BarChart2, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { Project } from '@/types/project'

interface Props {
  projects: Project[]
  isDarkMode: boolean
  onRefresh: () => void
}

export default function PublishedSitesCard({ projects, isDarkMode, onRefresh }: Props) {
  const [unpublishing, setUnpublishing] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const published = projects.filter(p => p.isPublished)
  if (published.length === 0) return null

  const getUrl = (p: Project): string | null =>
    p.publicUrl || (p.publicSlug ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildflow-ai.app'}/p/${p.publicSlug}` : null)

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      toast.success('URL copied!')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleUnpublish = async (projectId: string, projectName: string) => {
    if (!confirm(`Unpublish "${projectName}"?\n\nThe live URL will stop working immediately.`)) return
    setUnpublishing(projectId)
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Site unpublished')
        onRefresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to unpublish')
      }
    } catch {
      toast.error('Failed to unpublish')
    } finally {
      setUnpublishing(null)
    }
  }

  const bg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const divider = isDarkMode ? 'border-gray-700' : 'border-gray-100'
  const headerText = isDarkMode ? 'text-white' : 'text-gray-900'
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const rowHover = isDarkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'
  const actionBtn = isDarkMode
    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
  const unpublishBtn = isDarkMode
    ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/30'
    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'

  return (
    <div className={`${bg} rounded-2xl border mb-8 overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${divider}`}>
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-green-500" />
          <h2 className={`font-semibold text-base ${headerText}`}>Live Sites</h2>
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            {published.length} live
          </span>
        </div>
        <p className={`text-xs ${mutedText}`}>
          Manage your published sites
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs font-medium uppercase tracking-wide ${mutedText} border-b ${divider}`}>
              <th className="text-left px-6 py-3">Site</th>
              <th className="text-left px-6 py-3">Live URL</th>
              <th className="text-left px-6 py-3">Views</th>
              <th className="text-left px-6 py-3">Published</th>
              <th className="text-right px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {published.map(project => {
              const url = getUrl(project)
              const isNetlify = !!project.publishedSiteId
              const displayUrl = url
                ? url.replace(/^https?:\/\//, '')
                : null
              const publishedDate = project.publishedAt
                ? new Date(project.publishedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'

              return (
                <tr
                  key={project.id}
                  className={`${rowHover} transition-colors border-b ${divider} last:border-0`}
                >
                  {/* Site name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                      <div>
                        <p className={`font-medium truncate max-w-[180px] ${headerText}`}>
                          {project.name}
                        </p>
                        {isNetlify && (
                          <span className={`text-xs ${mutedText}`}>Netlify</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* URL */}
                  <td className="px-6 py-4">
                    {displayUrl ? (
                      <span className={`font-mono text-xs truncate max-w-[240px] block ${mutedText}`}>
                        {displayUrl}
                      </span>
                    ) : (
                      <span className={mutedText}>—</span>
                    )}
                  </td>

                  {/* Views */}
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 ${mutedText}`}>
                      <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{(project.views ?? 0).toLocaleString()}</span>
                    </div>
                  </td>

                  {/* Published date */}
                  <td className={`px-6 py-4 text-xs ${mutedText} whitespace-nowrap`}>
                    {publishedDate}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      {/* Visit */}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open live site"
                          className={`p-1.5 rounded-lg transition-colors ${actionBtn}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Copy URL */}
                      {url && (
                        <button
                          onClick={() => handleCopy(url, project.id)}
                          title="Copy URL"
                          className={`p-1.5 rounded-lg transition-colors ${actionBtn}`}
                        >
                          {copied === project.id ? (
                            <CheckCheck className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Unpublish */}
                      <button
                        onClick={() => handleUnpublish(project.id, project.name)}
                        disabled={unpublishing === project.id}
                        title="Unpublish site"
                        className={`p-1.5 rounded-lg transition-colors ${unpublishBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {unpublishing === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
