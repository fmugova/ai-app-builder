'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Eye, Code, Download, Copy, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    updatedAt: Date
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

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
        window.location.reload()
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

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 transition group">
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
      
      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📱</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-purple-400 transition">
                {project.name}
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(project.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Link
            href={`/builder?project=${project.id}`}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </Link>
          <Link
            href={`/preview/${project.id}`}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </Link>
          <Link
            href={`/projects/${project.id}`}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
          >
            <Code className="w-4 h-4" />
            <span>Code</span>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}