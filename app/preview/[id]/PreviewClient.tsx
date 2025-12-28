'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Eye, 
  Code, 
  Download,
  Github,
  Share2,
  ArrowLeft,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PreviewClientProps {
  project: {
    id: string
    name: string
    description: string | null
    code: string
    type: string
    isPublished: boolean
    publicUrl: string | null
    views: number
  }
}

export default function PreviewClient({ project }: PreviewClientProps) {
  const router = useRouter()
  const [showCode, setShowCode] = useState(false)
  const [deployingVercel, setDeployingVercel] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Publish to BuildFlow
  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('🎉 Published to BuildFlow!', {
          duration: 2000,
        })
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to publish')
      }
    } catch (error) {
      toast.error('Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  // Export to GitHub then deploy to Vercel
  const handleDeployToVercel = async () => {
    setDeployingVercel(true)
    
    try {
      const githubCheck = await fetch(`/api/projects/${project.id}/github-status`)
      const githubData = await githubCheck.json()
      
      if (!githubData.hasGithubRepo) {
        const confirmExport = confirm(
          '⚠️ Vercel requires GitHub.\n\nYour project will be:\n1. Exported to GitHub\n2. Deployed to Vercel\n\nContinue?'
        )
        
        if (!confirmExport) {
          setDeployingVercel(false)
          return
        }
        
        toast.loading('Exporting to GitHub...', { id: 'deploy-vercel' })
        
        const exportRes = await fetch(`/api/export/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id })
        })
        
        if (!exportRes.ok) {
          toast.error('GitHub export failed', { id: 'deploy-vercel' })
          setDeployingVercel(false)
          return
        }
        
        const exportData = await exportRes.json()
        toast.success('✅ Exported to GitHub!', { duration: 1000, id: 'export-gh' })
        
        await deployToVercel(exportData.repoName)
      } else {
        toast.loading('Deploying to Vercel...', { id: 'deploy-vercel' })
        await deployToVercel(githubData.repoName)
      }
    } catch (error) {
      toast.error('Deployment failed', { id: 'deploy-vercel' })
      setDeployingVercel(false)
    }
  }

  const deployToVercel = async (repoName: string) => {
    try {
      const res = await fetch(`/api/deploy/vercel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          githubRepoName: repoName
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('🚀 Deployed to Vercel!', { duration: 2000, id: 'deployed' })
        window.open(data.deploymentUrl, '_blank')
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Deployment failed', { id: 'deploy-vercel' })
      }
    } catch (error) {
      toast.error('Deployment failed', { id: 'deploy-vercel' })
    } finally {
      setDeployingVercel(false)
    }
  }

  // Export to GitHub
  const handleExportGithub = async () => {
    try {
      const res = await fetch(`/api/export/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success('✅ Exported to GitHub!')
        window.open(data.repoUrl, '_blank')
      } else {
        toast.error('GitHub export failed')
      }
    } catch (error) {
      toast.error('Export failed')
    }
  }

  // Download ZIP
  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/export/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          projectName: project.name,
          projectCode: project.code
        })
      })
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.name.replace(/\s+/g, '-')}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Downloaded!')
      } else {
        toast.error('Download failed')
      }
    } catch (error) {
      toast.error('Download failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-400">{project.description}</p>
              )}
            </div>

            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              {showCode ? <Eye className="w-5 h-5" /> : <Code className="w-5 h-5" />}
              {showCode ? 'Preview' : 'Code'}
            </button>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!project.isPublished ? (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {publishing ? 'Publishing...' : 'Publish to BuildFlow'}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Published</span>
                </div>
              )}

              <button
                onClick={handleDeployToVercel}
                disabled={deployingVercel}
                className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50 border border-gray-700"
              >
                {deployingVercel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 76 76" className="w-4 h-4" fill="white">
                      <path d="M38 0L76 76H0L38 0z" />
                    </svg>
                    Deploy to Vercel
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportGithub}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
              >
                <Github className="w-4 h-4" />
                Export to GitHub
              </button>

              {project.isPublished && project.publicUrl && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(project.publicUrl!)
                    toast.success('URL copied!', { duration: 2000 })
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showCode ? (
          /* Code View */
          <div className="h-full bg-gray-900 p-4 overflow-auto">
            <pre className="text-sm text-gray-300 font-mono">
              <code>{project.code}</code>
            </pre>
          </div>
        ) : (
          /* Preview View */
          <iframe
            srcDoc={project.code}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={project.name}
          />
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-gray-800 border-t border-gray-700 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>Type: {project.type}</span>
            <span>•</span>
            <span>Views: {project.views}</span>
          </div>
          <div>
            {project.isPublished && project.publicUrl && (
              <a
                href={project.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {project.publicUrl}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}