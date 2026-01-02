'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  code?: string
  isPublished: boolean
  publicUrl?: string
}

export default function ProjectOverviewPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchProject()
    }
  }, [status, projectId, router])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()
      setProject(data.project)
    } catch (err) {
      console.error('Failed to fetch project:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Project not found</p>
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-600 mt-1">Project Overview</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pages */}
          <Link
            href={`/dashboard/projects/${projectId}/pages`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-purple-500 transition group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pages</h3>
            </div>
            <p className="text-sm text-gray-600">
              Create and manage multiple pages for your website
            </p>
          </Link>

          {/* Navigation */}
          <Link
            href={`/dashboard/projects/${projectId}/navigation`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-500 transition group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">🧭</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Navigation</h3>
            </div>
            <p className="text-sm text-gray-600">
              Build and organize your site navigation
            </p>
          </Link>

          {/* SEO */}
          <Link
            href={`/dashboard/projects/${projectId}/seo`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-green-500 transition group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">SEO</h3>
            </div>
            <p className="text-sm text-gray-600">
              Optimize your pages for search engines
            </p>
          </Link>
        </div>

        {/* Project Info */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Project Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium text-gray-900">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-medium text-gray-900">
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium text-gray-900">
                {project.isPublished ? 'Published' : 'Draft'}
              </p>
            </div>
            {project.publicUrl && (
              <div>
                <p className="text-sm text-gray-600">URL</p>
                
                <a
                  href={project.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-purple-600 hover:text-purple-700"
                >
                  View Live →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}