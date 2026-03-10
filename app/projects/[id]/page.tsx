'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GenerationInterface from '@/components/GenerationInterface'
import AIIterationChat from '@/components/AIIterationChat'
import ProjectFileTree from '@/components/ProjectFileTree'
import ProjectActionsPanel from '@/components/ProjectActionsPanel'
import { Eye, Edit2, Code2, Sparkles, PanelLeft, PanelRight, X } from 'lucide-react'

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
  isPublished: boolean
  publicUrl: string | null
  User: {
    name: string | null
  }
  ProjectFile?: ProjectFile[]
}

export default function ProjectViewPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'preview' | 'edit' | 'code' | 'ai-chat'>('preview')
  const [liveCode, setLiveCode] = useState<string | null>(null)
  const [showMobileFiles, setShowMobileFiles] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)

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
        if (data.code) setLiveCode(data.code)
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
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

  const projectFiles = project.ProjectFile ?? []

  const existingFiles = projectFiles.map((file) => ({
    filename: file.path.split('/').pop() || file.path,
    content: file.content,
    path: file.path,
  }))

  const filesRecord: Record<string, string> = project.isMultiFile
    ? Object.fromEntries(projectFiles.map((f) => [f.path, f.content]))
    : { 'index.html': project.code ?? '' }

  const fileCount = project.isMultiFile ? projectFiles.length : 1

  const TABS = [
    { id: 'preview' as const, label: 'Preview', icon: Eye },
    { id: 'edit' as const, label: 'Edit & Iterate', icon: Edit2 },
    { id: 'code' as const, label: 'Code', icon: Code2 },
    ...(!project.isMultiFile && (liveCode || project.code)
      ? [{ id: 'ai-chat' as const, label: 'AI Chat', icon: Sparkles }]
      : []),
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 transition text-sm shrink-0"
          >
            ← Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{project.name}</h1>
            <p className="text-xs text-gray-400">
              {project.isMultiFile ? 'Next.js App' : 'Single Page'} · {fileCount} file{fileCount !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Mobile sidebar toggles */}
          <button
            onClick={() => setShowMobileFiles((v) => !v)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            title="Toggle file tree"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowMobileActions((v) => !v)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            title="Toggle actions panel"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: File Tree ── */}
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto hidden lg:block">
          <ProjectFileTree
            files={projectFiles}
            projectName={project.name}
            isMultiFile={project.isMultiFile ?? false}
            code={project.code ?? undefined}
          />
        </aside>

        {/* ── Center: Tabs + Content ── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-50">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 border-b border-gray-200 bg-white">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeView === id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-5">

            {/* Preview */}
            {activeView === 'preview' && (
              <div className="h-full flex flex-col gap-4">
                {(liveCode || project.code) ? (
                  <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-500">Live Preview</span>
                      <button
                        onClick={() => {
                          const blob = new Blob([liveCode || project.code || ''], { type: 'text/html' })
                          const url = URL.createObjectURL(blob)
                          window.open(url, '_blank')
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Open in new tab ↗
                      </button>
                    </div>
                    <iframe
                      srcDoc={liveCode || project.code || ''}
                      className="w-full h-full"
                      style={{ minHeight: '500px' }}
                      title="Project Preview"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Multi-file Next.js: show project info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <h2 className="text-base font-bold text-gray-900 mb-4">Project Details</h2>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Created</p>
                          <p className="font-medium text-gray-900">{new Date(project.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Last Updated</p>
                          <p className="font-medium text-gray-900">{new Date(project.updatedAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Project Type</p>
                          <p className="font-medium text-gray-900">{project.isMultiFile ? 'Next.js Multi-File' : 'Single Page'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Status</p>
                          <p className={`font-medium ${project.isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                            {project.isPublished ? 'Published' : 'Draft'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {project.prompt && (
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-base font-bold text-gray-900 mb-3">Original Prompt</h2>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.prompt}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Edit & Iterate */}
            {activeView === 'edit' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Edit & Iterate</h2>
                  <p className="text-sm text-gray-500">
                    Use the AI assistant to add features, modify styling, or enhance your project.
                    {existingFiles.length > 0 && ` Working with ${existingFiles.length} file(s).`}
                  </p>
                </div>
                <GenerationInterface
                  projectId={project.id}
                  existingFiles={existingFiles}
                />
              </div>
            )}

            {/* Code */}
            {activeView === 'code' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-bold text-gray-900">Source Code</h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(liveCode || project.code || '')
                      alert('Code copied to clipboard!')
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-xs font-medium"
                  >
                    Copy Code
                  </button>
                </div>
                <div className="p-5 overflow-auto max-h-[calc(100vh-220px)]">
                  <pre className="text-xs text-gray-700 font-mono leading-relaxed">
                    <code>{liveCode || project.code}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* AI Chat */}
            {activeView === 'ai-chat' && !project.isMultiFile && (
              <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: '500px' }}>
                <AIIterationChat
                  projectId={project.id}
                  currentCode={liveCode || project.code || ''}
                  onCodeUpdate={(newCode) => setLiveCode(newCode)}
                />
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                    Live Preview
                  </div>
                  <iframe
                    srcDoc={liveCode || project.code || ''}
                    className="flex-1 w-full"
                    title="AI Chat Preview"
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  />
                </div>
              </div>
            )}

          </div>
        </main>

        {/* ── Right sidebar: Actions Panel ── */}
        <aside className="w-64 shrink-0 border-l border-gray-200 bg-white overflow-y-auto hidden lg:block">
          <ProjectActionsPanel
            projectId={project.id}
            projectName={project.name}
            files={filesRecord}
            isMultiFile={project.isMultiFile ?? false}
            isPublished={project.isPublished ?? false}
            publicUrl={project.publicUrl}
            createdAt={project.createdAt}
            prompt={project.prompt}
            fileCount={fileCount}
          />
        </aside>

      </div>

      {/* ── Mobile: File tree drawer ── */}
      {showMobileFiles && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFiles(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Files</span>
              <button onClick={() => setShowMobileFiles(false)}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <ProjectFileTree
              files={projectFiles}
              projectName={project.name}
              isMultiFile={project.isMultiFile ?? false}
              code={project.code ?? undefined}
            />
          </div>
        </div>
      )}

      {/* ── Mobile: Actions drawer ── */}
      {showMobileActions && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileActions(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Actions</span>
              <button onClick={() => setShowMobileActions(false)}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <ProjectActionsPanel
              projectId={project.id}
              projectName={project.name}
              files={filesRecord}
              isMultiFile={project.isMultiFile ?? false}
              isPublished={project.isPublished ?? false}
              publicUrl={project.publicUrl}
              createdAt={project.createdAt}
              prompt={project.prompt}
              fileCount={fileCount}
            />
          </div>
        </div>
      )}

    </div>
  )
}
