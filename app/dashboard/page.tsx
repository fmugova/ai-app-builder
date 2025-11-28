'use client'

import { useEffect, useState, useMemo } from 'react' // ✅ Add useMemo
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Toaster, toast } from 'react-hot-toast'
import SimpleExportButton from '@/components/SimpleExportButton'
import SearchFilter from '@/components/SearchFilter' // ✅ Add this import

interface Project {
  id: string
  name: string
  description: string
  type: string
  code?: string
  createdAt: string
}

const STAT_CARDS = [
  {
    label: 'Total Projects',
    icon: '📁',
    color: 'from-purple-500 to-purple-600',
  },
  {
    label: 'Active',
    icon: '🚀',
    color: 'from-blue-500 to-blue-600',
  },
  {
    label: 'Completed',
    icon: '✅',
    color: 'from-green-500 to-green-600',
  },
  {
    label: 'In Progress',
    icon: '⚡',
    color: 'from-yellow-500 to-yellow-600',
  },
]

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ✅ ADD THESE: Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email)

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
    fetchProjects()
  }, [])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  // Fetch projects function
  const fetchProjects = async () => {
    try {
      setError(null)
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      } else {
        setError('Failed to load projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setError('Failed to fetch projects')
      toast.error('Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  // ✅ ADD THIS: Filter and sort logic
  const filteredProjects = useMemo(() => {
    let filtered = [...projects]

    // Search
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    return filtered
  }, [projects, searchQuery, filterType, sortBy])

  // ✅ ADD THIS: Get unique project types
  const projectTypes = useMemo(() => {
    return [...new Set(projects.map(p => p.type))]
  }, [projects])

  // Duplicate function
  const duplicateProject = async (projectId: string, projectName: string) => {
    try {
      toast.loading('Duplicating project...', { id: 'duplicate' })

      const response = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        await fetchProjects()
        toast.success(`✅ "${projectName}" duplicated successfully!`, { id: 'duplicate' })
      } else {
        const error = await response.json()
        toast.error(`❌ Error: ${error.error}`, { id: 'duplicate' })
      }
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error('❌ Failed to duplicate project', { id: 'duplicate' })
    }
  }

  // Delete project function
  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    try {
      toast.loading('Deleting project...', { id: 'delete' })

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchProjects()
        toast.success('✅ Project deleted successfully!', { id: 'delete' })
      } else {
        const error = await response.json()
        toast.error(`❌ Error: ${error.error}`, { id: 'delete' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('❌ Failed to delete project', { id: 'delete' })
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd' && selectedProjectId) {
        e.preventDefault()
        const project = projects.find(p => p.id === selectedProjectId)
        if (project) {
          duplicateProject(project.id, project.name)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedProjectId, projects])

  return (
    <>
      <Toaster position="top-right" />
      
      <div className={`min-h-screen transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-900' 
          : 'bg-gradient-to-br from-slate-50 via-white to-purple-50'
      }`}>
        {/* Header */}
        <header className={`border-b sticky top-0 z-50 shadow-sm backdrop-blur-sm transition-colors ${
          darkMode 
            ? 'bg-gray-800/95 border-gray-700' 
            : 'bg-white/95 border-gray-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo & User Info */}
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-xl shadow-lg">
                  <span className="text-white text-2xl font-bold">BF</span>
                </div>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    BuildFlow
                  </h1>
                  <p className={`text-xs sm:text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Welcome, {session?.user?.name}! 👋
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-3 rounded-xl transition-all ${
                    darkMode 
                      ? 'bg-yellow-900 hover:bg-yellow-800 text-yellow-200'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                  aria-label="Toggle dark mode"
                >
                  <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
                </button>

                {/* Analytics */}
                <button
                  onClick={() => router.push('/analytics')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium"
                >
                  <span>📊</span>
                  <span>Analytics</span>
                </button>

                {/* Admin Button */}
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-medium"
                  >
                    <span>🛡️</span>
                    <span>Admin</span>
                  </button>
                )}

                {/* Logout */}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`p-3 rounded-xl transition-all ${
                    darkMode
                      ? 'bg-purple-700 hover:bg-purple-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  aria-label="Sign out"
                >
                  <span className="text-xl">🚪</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className={`py-12 sm:py-16 ${
          darkMode 
            ? 'bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900' 
            : 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-center gap-6">
              {/* Title */}
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  Your Projects
                </h2>
                <p className="text-base sm:text-lg text-purple-100">
                  {filteredProjects.length} of {projects.length} projects
                </p>
              </div>

              {/* ✅ Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {/* Create New Project */}
                <button
                  onClick={() => router.push('/builder')}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-50 text-purple-600 rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">✨</span>
                  <span>Create New Project</span>
                </button>

                {/* ✅ Browse Templates Button */}
                <button
                  onClick={() => router.push('/templates')}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">📋</span>
                  <span>Browse Templates</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {STAT_CARDS.map((stat, i) => (
              <div 
                key={i} 
                className={`rounded-2xl shadow-lg p-4 sm:p-6 border transition-all hover:shadow-xl ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs sm:text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.label}
                  </p>
                  <div className={`bg-gradient-to-r ${stat.color} p-2 rounded-lg`}>
                    <span className="text-white text-lg sm:text-xl">{stat.icon}</span>
                  </div>
                </div>
                <p className={`text-2xl sm:text-4xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {projects.length}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ ADD THIS: Search & Filter Section */}
        {projects.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
            <SearchFilter
              onSearch={setSearchQuery}
              onFilterType={setFilterType}
              onSort={setSortBy}
              projectTypes={projectTypes}
            />
          </div>
        )}

        {/* ✅ Projects Grid - Updated to use filteredProjects */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading projects...
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className={`rounded-3xl shadow-xl p-8 sm:p-16 text-center border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}>
              <div className="text-6xl sm:text-8xl mb-6">🚀</div>
              <h3 className={`text-2xl sm:text-3xl font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                No projects yet
              </h3>
              <p className={`text-base sm:text-lg mb-8 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Start building something amazing today!
              </p>
              <button
                onClick={() => router.push('/builder')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition-all"
              >
                Create Your First Project
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            // ✅ No results found
            <div className={`rounded-3xl shadow-xl p-8 sm:p-16 text-center border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}>
              <div className="text-6xl sm:text-8xl mb-6">🔍</div>
              <h3 className={`text-2xl sm:text-3xl font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                No projects found
              </h3>
              <p className={`text-base sm:text-lg mb-8 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Try adjusting your search or filters
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('all')
                  setSortBy('newest')
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* ✅ Use filteredProjects instead of projects */}
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border overflow-hidden ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  {/* Project Header */}
                  <div className={`p-6 text-white ${
                    darkMode
                      ? 'bg-gradient-to-r from-purple-700 to-blue-700'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-4xl">
                        {getProjectIcon(project.type)}
                      </div>
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium capitalize">
                        {project.type}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold truncate">{project.name}</h3>
                  </div>

                  {/* Project Body */}
                  <div className="p-6">
                    <p className={`text-sm mb-4 line-clamp-2 min-h-[40px] ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {project.description || 'No description provided'}
                    </p>

                    <div className={`flex items-center gap-2 text-xs mb-6 ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      <span>📅</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => router.push(`/builder?project=${project.id}`)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all hover:scale-105 ${
                          darkMode
                            ? 'bg-purple-900/50 hover:bg-purple-900 text-purple-300'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                        }`}
                      >
                        <span className="text-xl">✏️</span>
                        <span className="text-xs font-medium">Edit</span>
                      </button>

                      {/* Preview Button */}
                      <button
                        onClick={() => window.open(`/preview/${project.id}`, '_blank', 'noopener,noreferrer')}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all hover:scale-105 ${
                          darkMode
                            ? 'bg-blue-900/50 hover:bg-blue-900 text-blue-300'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}
                        title="Open preview in new tab"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xl">👁️</span>
                          <span className="text-xs">↗️</span>
                        </div>
                        <span className="text-xs font-medium">Preview</span>
                      </button>

                      {/* Duplicate Button */}
                      <button
                        onClick={() => duplicateProject(project.id, project.name)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all hover:scale-105 ${
                          darkMode
                            ? 'bg-amber-900/50 hover:bg-amber-900 text-amber-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                        }`}
                        title="Duplicate this project"
                      >
                        <span className="text-xl">📋</span>
                        <span className="text-xs font-medium">Duplicate</span>
                      </button>
                    </div>

                    {/* Second row */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Export Button */}
                      <SimpleExportButton
                        projectId={project.id}
                        projectName={project.name}
                        projectCode={project.code || ''}
                        projectType={project.type}
                        onSuccess={() => console.log('Export successful!')}
                        onError={(error) => console.error('Export failed:', error)}
                      />

                      {/* Delete Button */}
                      <button
                        onClick={() => deleteProject(project.id)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all hover:scale-105 ${
                          darkMode
                            ? 'bg-red-900/50 hover:bg-red-900 text-red-300'
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        <span className="text-xl">🗑️</span>
                        <span className="text-xs font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Helper function for project icons
function getProjectIcon(type: string) {
  switch (type) {
    case 'landing-page':
      return '🚀'
    case 'dashboard':
      return '📊'
    case 'blog':
      return '📝'
    case 'portfolio':
      return '💼'
    case 'e-commerce':
      return '🛒'
    default:
      return '📄'
  }
}