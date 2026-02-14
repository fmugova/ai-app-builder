'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DeployButton from '@/components/DeployButton'
import GenerationInterface from '@/components/GenerationInterface'
import { FileText, Eye, Edit2, Code2 } from 'lucide-react'

interface ProjectFile {
  id: string
  projectId: string
  path: string
  content: string
  createdAt: string
  updatedAt: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  prompt: string | null
  code: string | null
  createdAt: string
  updatedAt: string
  userId: string
  multiPage: boolean | null
  isMultiFile: boolean | null
  User: {
    name: string | null
    email: string
  }
  ProjectFile?: ProjectFile[]
}

export default function ProjectViewPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'preview' | 'edit' | 'files' | 'code'>('preview')

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

  // Transform project files for GenerationInterface
  const existingFiles = (project.ProjectFile || []).map(file => ({
    filename: file.path.split('/').pop() || file.path,
    content: file.content,
    path: file.path
  }))

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
                  By {project.User?.name || project.User?.email || 'Unknown User'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {project.isMultiFile && existingFiles.length > 0 && (
                <span className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {existingFiles.length} files
                </span>
              )}
              <DeployButton 
                projectId={project.id} 
                projectName={project.name}
                size="md"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-lg border border-gray-700 w-fit">
          <button
            onClick={() => setActiveView('preview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeView === 'preview'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setActiveView('edit')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeView === 'edit'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            Edit & Iterate
          </button>
          {project.isMultiFile && existingFiles.length > 0 && (
            <button
              onClick={() => setActiveView('files')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeView === 'files'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Files
            </button>
          )}
          <button
            onClick={() => setActiveView('code')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeView === 'code'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Code
          </button>
        </div>

        {/* Preview View */}
        {activeView === 'preview' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
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
                  <p className="font-medium">{project.User?.email || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Project Type</p>
                  <p className="font-medium">{project.isMultiFile ? 'Multi-File' : 'Single Page'}</p>
                </div>
              </div>
            </div>

            {project.description && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Description</h2>
                <p className="text-gray-300">{project.description}</p>
              </div>
            )}

            {project.prompt && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Original Prompt</h2>
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-300 whitespace-pre-wrap">{project.prompt}</p>
                </div>
              </div>
            )}

            {project.code && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Live Preview</h2>
                  <button
                    onClick={() => {
                      const blob = new Blob([project.code || ''], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      window.open(url, '_blank')
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
                  >
                    Open in New Tab
                  </button>
                </div>
                <div className="border border-gray-700 rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={project.code}
                    className="w-full h-[600px]"
                    title="Project Preview"
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit & Iterate View */}
        {activeView === 'edit' && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">✨ Edit & Iterate on Project</h2>
              <p className="text-gray-400">
                Use the AI assistant below to add features, modify styling, or enhance your project.
                {existingFiles.length > 0 && ` Currently working with ${existingFiles.length} file(s).`}
              </p>
            </div>
            
            <GenerationInterface
              projectId={project.id}
              existingFiles={existingFiles}
            />
          </div>
        )}

        {/* Files View (multi-file projects) */}
        {activeView === 'files' && project.isMultiFile && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Project Files ({existingFiles.length})</h2>
            
            {existingFiles.length === 0 ? (
              <p className="text-gray-400">No files found in this project.</p>
            ) : (
              <div className="space-y-4">
                {existingFiles.map((file, index) => (
                  <div key={index} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="font-medium text-white">{file.filename}</p>
                          <p className="text-sm text-gray-400">{file.path}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {(file.content.length / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="p-4 bg-gray-950">
                      <pre className="text-sm text-gray-300 overflow-x-auto max-h-96">
                        <code>{file.content}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Code View */}
        {activeView === 'code' && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Source Code</h2>
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
      </div>
    </div>
  )
}