'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Eye, Code, Download, Copy, Trash2, Share2, ExternalLink, Globe } from 'lucide-react'
import Link from 'next/link'
import ShareModal from './ShareModal'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    updatedAt: Date
    isPublished?: boolean
    publicUrl?: string | null
    views?: number
  }
  onRefresh?: () => void
}

export function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const handleCopy = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.code) {
          await navigator.clipboard.writeText(data.code)
          alert('Code copied to clipboard!')
        }
      }
    } catch (error) {
      console.error('Copy error:', error)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.code) {
          const blob = new Blob([data.code], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${project.name}.html`
          a.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        onRefresh?.() || window.location.reload()
      } else {
        alert('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Published! URL: ${data.publicUrl}`)
        onRefresh?.() || window.location.reload()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to publish project')
      }
    } catch (error) {
      console.error('Publish error:', error)
      alert('Failed to publish project')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this project? The public URL will stop working.')) return
    
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'DELETE'
      })
      if (res.ok) {
        alert('Project unpublished successfully')
        onRefresh?.() || window.location.reload()
      } else {
        alert('Failed to unpublish project')
      }
    } catch (error) {
      console.error('Unpublish error:', error)
      alert('Failed to unpublish project')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-purple-500 transition">
        {/* Gradient Header */}
        <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>

        {/* Project Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-gray-500">
                {new Date(project.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              {project.isPublished ? (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Published
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                  Draft
                </span>
              )}
            </div>
          </div>

          {/* Title - Fixed truncation */}
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1" title={project.name}>
            {project.name}
          </h3>

          {/* Description - Fixed truncation */}
          <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
            {project.description || 'No description provided'}
          </p>

          {/* Stats */}
          {project.isPublished && project.views !== undefined && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
              <Eye className="w-3 h-3" />
              <span>{project.views} views</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => router.push(`/builder?project=${project.id}`)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => router.push(`/preview/${project.id}`)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>

          {/* Publish/Share Actions */}
          {project.isPublished ? (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleUnpublish}
                disabled={isPublishing}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {isPublishing ? 'Unpublishing...' : 'Unpublish'}
              </button>
            </div>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full mb-3 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {isPublishing ? 'Publishing...' : 'Publish Site'}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">Copy</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {project.isPublished && project.publicUrl && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectName={project.name}
          publicUrl={project.publicUrl}
          views={project.views}
        />
      )}
    </>
  )
}