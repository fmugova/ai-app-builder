'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  code: string
  type: string | null
  isPublished: boolean
  publicUrl: string | null
  views: number
  createdAt: string
  updatedAt: string
}

interface User {
  name: string
  email: string
  isAdmin: boolean
}

interface ProjectSettingsClientProps {
  project: Project
  user: User
}

export default function ProjectSettingsClient({ project, user }: ProjectSettingsClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    type: project.type || 'website',
  })

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        router.refresh()
        alert('Project updated successfully!')
      } else {
        alert('Failed to update project')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/dashboard?deleted=true')
      } else {
        alert('Failed to delete project')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete project')
      setIsLoading(false)
    }
  }

  const copyProjectId = () => {
    navigator.clipboard.writeText(project.id)
    alert('Project ID copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={`/dashboard/projects/${project.id}`}
                className="text-gray-400 hover:text-white transition"
              >
                ← Back to Overview
              </Link>
              <div className="h-6 w-px bg-gray-700" />
              <h1 className="text-xl font-bold text-white">Project Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Project Info Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{project.name}</h2>
              <div className="flex items-center gap-3">
                {project.isPublished && (
                  <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-medium border border-green-700">
                    ✓ Published
                  </span>
                )}
                {!project.isPublished && (
                  <span className="px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-sm font-medium border border-gray-600">
                    Draft
                  </span>
                )}
                <span className="text-gray-400 text-sm">{project.views} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              General Settings
            </h3>

            <form onSubmit={handleUpdateProject} className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter project name"
                  required
                />
              </div>

              {/* Project Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Enter project description (optional)"
                />
              </div>

              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="website">Website</option>
                  <option value="landing-page">Landing Page</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="blog">Blog</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Project Information */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Project Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="text-sm text-gray-400">Project ID</p>
                  <p className="text-white font-mono text-sm mt-1">{project.id}</p>
                </div>
                <button
                  onClick={copyProjectId}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition"
                >
                  Copy
                </button>
              </div>

              <div className="py-3 border-b border-gray-700">
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-white text-sm mt-1">
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="py-3 border-b border-gray-700">
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-white text-sm mt-1">
                  {new Date(project.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="py-3">
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="text-white text-sm mt-1">{project.views} views</p>
              </div>
            </div>
          </div>

          {/* Publishing Settings */}
          {project.publicUrl && (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">🌐</span>
                Publishing
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="text-sm text-gray-400">Public URL</p>
                    <a
                      href={project.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-mono text-sm mt-1 block"
                    >
                      {project.publicUrl}
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(project.publicUrl!)
                      alert('URL copied to clipboard!')
                    }}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition"
                  >
                    Copy
                  </button>
                </div>

                <div className="py-3">
                  <p className="text-sm text-gray-400">Status</p>
                  <div className="mt-2">
                    {project.isPublished ? (
                      <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-medium border border-green-700">
                        ✓ Published
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-sm font-medium border border-gray-600">
                        Unpublished
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-red-900/10 border border-red-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Danger Zone
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-white font-medium mb-1">Delete Project</p>
                  <p className="text-sm text-gray-400">
                    Once you delete a project, there is no going back. Please be certain.
                  </p>
                </div>
                <button
                  onClick={handleDeleteProject}
                  disabled={isLoading}
                  className={`px-6 py-3 ${
                    showDeleteConfirm
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-900/50 hover:bg-red-900/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium border border-red-700`}
                >
                  {isLoading ? 'Deleting...' : showDeleteConfirm ? '⚠️ Confirm Delete' : '🗑️ Delete Project'}
                </button>
              </div>

              {showDeleteConfirm && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-300 text-sm mb-3">
                    ⚠️ Are you absolutely sure? This action cannot be undone. This will permanently delete the project and all associated data.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-sm text-gray-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
              >
                ⚙️ Overview
              </Link>
              <Link
                href={`/chatbuilder?projectId=${project.id}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium"
              >
                ✏️ Edit in Builder
              </Link>
              <Link
                href={`/dashboard/projects/${project.id}/pages`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
              >
                📄 Pages
              </Link>
              <Link
                href={`/dashboard/projects/${project.id}/seo`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
              >
                🔍 SEO
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}