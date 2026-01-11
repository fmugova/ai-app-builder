'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProjectCard from './ProjectCard'
import type { Project } from '@/types/project'

interface ProjectListProps {
  initialProjects: Project[]
  isDarkMode: boolean
  onDelete: (projectId: string) => void
  onRefresh: () => void
}

export default function ProjectList({ initialProjects, isDarkMode, onDelete, onRefresh }: ProjectListProps) {
  const [projects] = useState<Project[]>(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = (projects || []).filter(project =>
    (project.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  return (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Your Projects</h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 placeholder-gray-500'} border rounded-lg`}
          />
          <Link href="/builder" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium flex items-center gap-2">
            <span className="text-lg">✨</span>
            New Project
          </Link>
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id}>
              <ProjectCard
                project={{
                  ...project,
                  createdAt: new Date(project.createdAt),
                  updatedAt: new Date(project.updatedAt),
                  description: project.description || '',
                  type: project.type || '',
                  isPublished: project.isPublished ?? false,
                  publicUrl: project.publicUrl || null,
                  views: project.views ?? 0,
                }}
                onDelete={() => onDelete(project.id)}
                onRefresh={onRefresh}
              />
              <div className={`mt-3 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/projects/${project.id}`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition`}>
                    ⚙️ Overview
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}/pages`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} transition`}>
                    📄 Pages
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}/navigation`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition`}>
                    🧭 Nav
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}/seo`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70' : 'bg-green-100 text-green-700 hover:bg-green-200'} transition`}>
                    🔍 SEO
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}/analytics`} className={`px-3 py-1.5 text-xs rounded-md ${isDarkMode ? 'bg-cyan-900/50 text-cyan-300 hover:bg-cyan-900/70' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'} transition`}>
                    📊 Analytics
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className={`w-24 h-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <span className="text-5xl">📭</span>
          </div>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            {searchQuery ? 'No projects match your search' : 'No projects yet'}
          </h3>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchQuery ? 'Try a different search term' : "Let's create your first AI-powered project"}
          </p>
          <Link href="/builder" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">
            Create Your First Project
          </Link>
        </div>
      )}
    </div>
  )
}
