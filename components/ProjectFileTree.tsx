'use client'

interface ProjectFile {
  id: string
  projectId: string
  path: string
  content: string
  createdAt: string
  updatedAt: string | null
}

interface ProjectFileTreeProps {
  files: ProjectFile[]
  projectName: string
  isMultiFile: boolean
  code?: string
}

function getFileIcon(path: string): { icon: string; color: string } {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'tsx' || ext === 'ts') return { icon: '📄', color: 'text-blue-500' }
  if (ext === 'css') return { icon: '🎨', color: 'text-purple-500' }
  if (ext === 'html') return { icon: '🌐', color: 'text-orange-500' }
  if (ext === 'json') return { icon: '📋', color: 'text-yellow-500' }
  if (ext === 'sql') return { icon: '🗄️', color: 'text-green-500' }
  if (ext === 'md') return { icon: '📝', color: 'text-gray-500' }
  return { icon: '📄', color: 'text-gray-400' }
}

function getDirectory(path: string): string {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

function getFileName(path: string): string {
  return path.split('/').pop() ?? path
}

export default function ProjectFileTree({
  files,
  projectName,
  isMultiFile,
  code,
}: ProjectFileTreeProps) {
  if (!isMultiFile) {
    return (
      <div className="p-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Files (1)
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
          <span className="text-orange-500 text-sm">🌐</span>
          <span className="text-xs text-gray-700 font-mono">index.html</span>
        </div>
      </div>
    )
  }

  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

  // Group files by top-level directory
  const groups = new Map<string, ProjectFile[]>()
  for (const file of sortedFiles) {
    const dir = getDirectory(file.path)
    const topDir = dir.split('/')[0] ?? ''
    const key = topDir || '(root)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(file)
  }

  const groupEntries = Array.from(groups.entries()).sort(([a], [b]) => {
    // Sort: root first, then alphabetical
    if (a === '(root)') return -1
    if (b === '(root)') return 1
    return a.localeCompare(b)
  })

  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
        Files ({files.length})
      </div>

      {groupEntries.map(([dir, groupFiles]) => (
        <div key={dir} className="mb-2">
          {dir !== '(root)' && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500">
              <span>📁</span>
              <span>{dir}/</span>
            </div>
          )}
          <div className={dir !== '(root)' ? 'pl-3' : ''}>
            {groupFiles.map((file) => {
              const { icon, color } = getFileIcon(file.path)
              const name = getFileName(file.path)
              const subDir = getDirectory(file.path)
              const showSubDir = dir !== '(root)' && subDir !== dir && subDir.startsWith(dir)
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 group"
                  title={file.path}
                >
                  {showSubDir && (
                    <span className="text-gray-300 text-xs">
                      {subDir.slice(dir.length + 1)}/
                    </span>
                  )}
                  <span className={`text-sm shrink-0 ${color}`}>{icon}</span>
                  <span className="text-xs text-gray-700 font-mono truncate">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
