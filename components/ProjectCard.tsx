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
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-purple-500 transition">
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>

      {/* Project Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Edit className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-gray-500">
            {new Date(project.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>

        {/* Title - Fixed truncation */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1" title={project.name}>
          {project.name}
        </h3>

        {/* Description - Fixed truncation */}
        <p className="text-sm text-gray-400 mb-6 line-clamp-2 min-h-[40px]">
          {project.description || 'No description provided'}
        </p>

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

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
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
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}