'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Copy, ExternalLink, Edit3, Globe, Calendar, Layers } from 'lucide-react'
import DeployButton from '@/components/DeployButton'
import PushToGitHubButton from '@/components/PushToGitHubButton'
import { DownloadButton } from '@/components/DownloadButton'

interface ProjectActionsPanelProps {
  projectId: string
  projectName: string
  files: Record<string, string>
  isMultiFile: boolean
  isPublished: boolean
  publicUrl?: string | null
  createdAt: string
  prompt?: string | null
  fileCount: number
}

export default function ProjectActionsPanel({
  projectId,
  projectName,
  files,
  isMultiFile,
  isPublished,
  publicUrl,
  createdAt,
  prompt,
  fileCount,
}: ProjectActionsPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 space-y-5">

      {/* Publish / Deploy */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Publish Live
        </h3>
        <DeployButton projectId={projectId} projectName={projectName} size="lg" />
        {isPublished && publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            View Live Site
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </section>

      <div className="border-t border-gray-100" />

      {/* GitHub */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          GitHub
        </h3>
        <PushToGitHubButton projectId={projectId} />
      </section>

      <div className="border-t border-gray-100" />

      {/* Download */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Download
        </h3>
        <DownloadButton files={files} projectName={projectName} />
      </section>

      <div className="border-t border-gray-100" />

      {/* Share */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Share
        </h3>
        {isPublished && publicUrl ? (
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        ) : (
          <p className="text-xs text-gray-400 italic">Publish first to share</p>
        )}
      </section>

      <div className="border-t border-gray-100" />

      {/* Edit */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Edit
        </h3>
        <Link
          href={`/chatbuilder?project=${projectId}`}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit / Add Features
        </Link>
      </section>

      <div className="border-t border-gray-100" />

      {/* Project info */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Project Info
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{isMultiFile ? 'Next.js App' : 'Single Page'}</span>
          <span className="ml-auto text-gray-400">{fileCount} files</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{new Date(createdAt).toLocaleDateString()}</span>
        </div>
      </section>

    </div>
  )
}
