'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Project {
  id: string
  name: string
  description: string | null
  prompt: string | null
  code: string | null
  createdAt: string
  updatedAt: string
  userId: string
  user: {
    name: string | null
    email: string
  }
}

export default function ProjectViewPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const projectId = params.id as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    loadProject()
  }, [session, status, projectId])

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/view`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      } else {
        alert('Project not found or access denied')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Project not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white transition"
              >
                ← Back
              </button>
              <div className="h-6 w-px bg-gray-700"></div>
              <div>
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <p className="text-sm text-gray-400">
                  By {project.user?.name || project.user?.email || 'Unknown User'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                window.location.href = `/builder?project=${project.id}`
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Edit Project
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Project Info */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-bold mb-4">Project Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Created</p>
              <p className="font-medium">{new Date(project.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Last Updated</p>
              <p className="font-medium">{new Date(project.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Owner</p>
              <p className="font-medium">{project.user?.email || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Project ID</p>
              <p className="font-medium font-mono text-sm">{project.id.slice(0, 20)}...</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Description</h2>
            <p className="text-gray-300">{project.description}</p>
          </div>
        )}

        {/* Original Prompt */}
        {project.prompt && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Original Prompt</h2>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-300 whitespace-pre-wrap">{project.prompt}</p>
            </div>
          </div>
        )}

        {/* Code Preview */}
        {project.code && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Code</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(project.code || '')
                  alert('Code copied to clipboard!')
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
              >
                Copy Code
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-[600px]">
              <pre className="text-sm text-gray-300">
                <code>{project.code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Preview Button */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => window.close()}
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
          >
            Close Window
          </button>
          <button
            onClick={() => window.location.href = `/builder?project=${project.id}`}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
          >
            🚀 Open in Editor
          </button>
        </div>
      </div>
    </div>
  )
}