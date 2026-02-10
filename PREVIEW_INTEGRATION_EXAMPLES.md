# 🔌 Dual Preview System - Integration Examples

## How to Use DualPreviewSystem Component

### Basic Usage

```tsx
import DualPreviewSystem from '@/components/DualPreviewSystem'

function ChatBuilder() {
  const [project, setProject] = useState(null)

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Chat/Code Panel */}
      <div>
        <ChatInterface onProjectGenerate={setProject} />
      </div>

      {/* Preview Panel */}
      <div>
        {project && (
          <DualPreviewSystem
            project={{
              id: project.id,
              type: project.projectType === 'nextjs' ? 'nextjs' : 'html',
              html: project.code, // For HTML projects
              files: project.files, // For Next.js projects
            }}
          />
        )}
      </div>
    </div>
  )
}
```

---

## Advanced Examples

### 1. Auto-Detect Project Type

```tsx
function getProjectType(project: Project): 'html' | 'nextjs' {
  // Method 1: Check projectType field
  if (project.projectType === 'nextjs' || project.projectType === 'multi-file') {
    return 'nextjs'
  }

  // Method 2: Check if multi-file
  if (project.isMultiFile || (project.files && project.files.length > 1)) {
    return 'nextjs'
  }

  // Method 3: Check for Next.js indicators
  const hasPackageJson = project.files?.some(f => f.path === 'package.json')
  const hasAppDir = project.files?.some(f => f.path.startsWith('app/'))
  
  if (hasPackageJson && hasAppDir) {
    return 'nextjs'
  }

  // Default to HTML
  return 'html'
}

// Usage
<DualPreviewSystem
  project={{
    id: project.id,
    type: getProjectType(project),
    html: project.code,
    files: project.files,
  }}
/>
```

### 2. With Loading State

```tsx
function PreviewPanel({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  })

  if (isLoading) {
    return <PreviewSkeleton />
  }

  if (!project) {
    return <EmptyState />
  }

  return (
    <DualPreviewSystem
      project={{
        id: project.id,
        type: project.type,
        html: project.html,
        files: project.files,
      }}
    />
  )
}
```

### 3. With Error Boundary

```tsx
import { ErrorBoundary } from 'react-error-boundary'

function PreviewWithFallback({ project }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p>Preview failed to load</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      }
    >
      <DualPreviewSystem project={project} />
    </ErrorBoundary>
  )
}
```

### 4. With Refresh Button

```tsx
function PreviewPanel({ project }) {
  const [key, setKey] = useState(0)

  return (
    <div>
      <div className="flex items-center justify-between p-2 border-b">
        <h3>Preview</h3>
        <button
          onClick={() => setKey(k => k + 1)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <DualPreviewSystem
        key={key} // Force re-render on refresh
        project={project}
      />
    </div>
  )
}
```

---

## Server-Side Data Fetching

### Next.js App Router (Server Component)

```tsx
// app/projects/[id]/page.tsx
import { prisma } from '@/lib/prisma'
import DualPreviewSystem from '@/components/DualPreviewSystem'

export default async function ProjectPage({
  params,
}: {
  params: { id: string }
}) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      projectType: true,
      code: true,
      files: true,
    },
  })

  if (!project) {
    return <div>Project not found</div>
  }

  return (
    <div className="container">
      <DualPreviewSystem
        project={{
          id: project.id,
          type: project.projectType === 'nextjs' ? 'nextjs' : 'html',
          html: project.code,
          files: project.files,
        }}
      />
    </div>
  )
}
```

### API Route Integration

```tsx
// app/api/projects/[id]/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      projectType: true,
      code: true,
      files: true,
    },
  })

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    id: project.id,
    type: project.projectType === 'nextjs' ? 'nextjs' : 'html',
    html: project.code,
    files: project.files,
  })
}
```

---

## TypeScript Types

### Type Definitions

```typescript
// types/preview.ts

export type ProjectType = 'html' | 'nextjs'

export interface ProjectFile {
  path: string
  content: string
}

export interface PreviewProject {
  id: string
  type: ProjectType
  html?: string
  files?: ProjectFile[]
}

export interface PreviewProps {
  project: PreviewProject
}

// Component usage
import { PreviewProject } from '@/types/preview'

const project: PreviewProject = {
  id: '123',
  type: 'nextjs',
  files: [
    { path: 'app/page.tsx', content: '...' },
    { path: 'package.json', content: '...' },
  ],
}
```

---

## Database Queries

### Fetch Project with Files

```typescript
// For Next.js projects with files
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    ProjectFile: {
      select: {
        path: true,
        content: true,
      },
    },
  },
})

// Transform to PreviewProject
const previewProject = {
  id: project.id,
  type: 'nextjs' as const,
  files: project.ProjectFile.map(f => ({
    path: f.path,
    content: f.content,
  })),
}
```

### Fetch HTML Project

```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  select: {
    id: true,
    code: true,
    projectType: true,
  },
})

const previewProject = {
  id: project.id,
  type: 'html' as const,
  html: project.code,
}
```

---

## Real-World Integration Example

### Full Chat Builder Implementation

```tsx
'use client'

import { useState, useEffect } from 'react'
import DualPreviewSystem from '@/components/DualPreviewSystem'
import ChatInterface from '@/components/ChatInterface'

export default function ChatBuilder({ initialProject }: { initialProject?: Project }) {
  const [project, setProject] = useState(initialProject)
  const [isGenerating, setIsGenerating] = useState(false)

  // Handle project generation
  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()
      setProject(data.project)
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Prepare preview data
  const previewData = project ? {
    id: project.id,
    type: project.projectType === 'nextjs' ? 'nextjs' as const : 'html' as const,
    html: project.code,
    files: project.files,
  } : null

  return (
    <div className="h-screen flex">
      {/* Chat Side */}
      <div className="w-1/2 border-r">
        <ChatInterface
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </div>

      {/* Preview Side */}
      <div className="w-1/2">
        {previewData ? (
          <DualPreviewSystem project={previewData} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Generate a project to see preview
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Testing

### Unit Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import DualPreviewSystem from '@/components/DualPreviewSystem'

describe('DualPreviewSystem', () => {
  it('renders HTML preview instantly', () => {
    const project = {
      id: '123',
      type: 'html' as const,
      html: '<h1>Test</h1>',
    }

    render(<DualPreviewSystem project={project} />)

    expect(screen.getByText('Live Preview')).toBeInTheDocument()
    expect(screen.getByTitle('Preview')).toBeInTheDocument()
  })

  it('deploys Next.js project to Vercel', async () => {
    const project = {
      id: '123',
      type: 'nextjs' as const,
      files: [
        { path: 'app/page.tsx', content: 'export default function Page() {}' },
      ],
    }

    render(<DualPreviewSystem project={project} />)

    expect(screen.getByText('Deploying to Vercel...')).toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getByText('Deployed Successfully')).toBeInTheDocument()
      },
      { timeout: 60000 }
    )
  })
})
```

---

## Common Patterns

### 1. Conditional Rendering

```tsx
{project.type === 'html' ? (
  <SimplePreview html={project.html} />
) : (
  <DualPreviewSystem project={project} />
)}
```

### 2. Multiple Preview Tabs

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="preview">Preview</TabsTrigger>
    <TabsTrigger value="code">Code</TabsTrigger>
  </TabsList>

  <TabsContent value="preview">
    <DualPreviewSystem project={project} />
  </TabsContent>

  <TabsContent value="code">
    <CodeEditor files={project.files} />
  </TabsContent>
</Tabs>
```

### 3. Responsive Layout

```tsx
<div className="flex flex-col lg:flex-row">
  {/* Chat - full width on mobile, half on desktop */}
  <div className="w-full lg:w-1/2">
    <ChatInterface />
  </div>

  {/* Preview - full width on mobile, half on desktop */}
  <div className="w-full lg:w-1/2 h-[500px] lg:h-screen">
    <DualPreviewSystem project={project} />
  </div>
</div>
```

---

## Performance Tips

### 1. Memoize Preview Data

```tsx
const previewData = useMemo(() => ({
  id: project.id,
  type: project.type,
  html: project.html,
  files: project.files,
}), [project.id, project.type, project.html, project.files])

<DualPreviewSystem project={previewData} />
```

### 2. Lazy Load Component

```tsx
import dynamic from 'next/dynamic'

const DualPreviewSystem = dynamic(
  () => import('@/components/DualPreviewSystem'),
  { loading: () => <PreviewSkeleton /> }
)
```

### 3. Debounce Updates

```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

function PreviewPanel({ project }) {
  const debouncedProject = useDebouncedValue(project, 500)

  return <DualPreviewSystem project={debouncedProject} />
}
```

---

## Next Steps

1. **Implement in your chat builder**
2. **Test with both HTML and Next.js projects**
3. **Monitor Vercel deployment usage**
4. **Gather user feedback**
5. **Optimize based on usage patterns**

---

**🎉 You're ready to integrate the preview system!**
