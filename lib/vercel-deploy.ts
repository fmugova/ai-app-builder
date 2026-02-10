// lib/vercel-deploy.ts
// Automatic deployment to Vercel

import { DeploymentConfig, DeploymentResult } from './types/deployment';

interface VercelProject {
  id: string
  name: string
  url: string
}

/**
 * Deploy full-stack application to Vercel
 * This handles both frontend (HTML) and backend (API routes)
 */
export async function deployToVercel(
  config: DeploymentConfig & {
    projectId: string;
    apiEndpoints: Array<{ path: string; method: string; code: string }>;
    supabaseUrl?: string;
    supabaseKey?: string;
  },
  vercelToken: string
): Promise<DeploymentResult> {
  try {
    // 1. Create or get Vercel project
    const project = await createVercelProject(
      config.projectName,
      vercelToken
    )

    // 2. Generate Next.js project structure
    const files = generateNextJsFiles(config)

    // 3. Deploy to Vercel
    const deployment = await createDeployment(
      project.id,
      files,
      config.envVars || {},
      vercelToken
    )

    // 4. Wait for deployment to complete
    const deploymentUrl = await waitForDeployment(
      deployment.id,
      vercelToken
    )

    return {
      success: true,
      vercelProjectId: project.id,
      deploymentUrl
    }
  } catch (error) {
    console.error('Vercel deployment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deployment failed'
    }
  }
}

/**
 * Create Vercel project
 */
async function createVercelProject(
  name: string,
  token: string
): Promise<VercelProject> {
  const response = await fetch('https://api.vercel.com/v9/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      framework: 'nextjs'
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create Vercel project')
  }

  return await response.json()
}

/**
 * Generate Next.js file structure from BuildFlow project
 */
function generateNextJsFiles(config: DeploymentConfig): Record<string, string> {
  const files: Record<string, string> = {}

  // package.json
  files['package.json'] = JSON.stringify({
    name: config.projectName,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start'
    },
    dependencies: {
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      '@supabase/supabase-js': '^2.38.0',
      '@prisma/client': '^5.0.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      typescript: '^5.0.0',
      prisma: '^5.0.0'
    }
  }, null, 2)

  // next.config.js
  files['next.config.js'] = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
`.trim()

  // tsconfig.json
  files['tsconfig.json'] = JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      lib: ['DOM', 'DOM.Iterable', 'ESNext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      paths: {
        '@/*': ['./*']
      }
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules']
  }, null, 2)

  // app/page.tsx - Convert HTML to React
  files['app/page.tsx'] = `
export default function Home() {
  return (
    <div dangerouslySetInnerHTML={{ __html: \`${config.html.replace(/`/g, '\\`')}\` }} />
  )
}
`.trim()

  // app/layout.tsx
  files['app/layout.tsx'] = `
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`.trim()

  // Generate API routes
  if (config.apiEndpoints && config.apiEndpoints.length > 0) {
    config.apiEndpoints.forEach(endpoint => {
      const routePath = endpoint.path.replace('/api/', 'app/api/') + '/route.ts'
      files[routePath] = endpoint.code
    })
  }

  // .env.local for environment variables
  const envVars = config.envVars || {};
  if (Object.keys(envVars).length > 0) {
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    files['.env.local'] = envContent
  }

  // Add Supabase config if provided in envVars
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
  const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    files['lib/supabase.ts'] = `
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
`.trim()
  }

  return files
}

/**
 * Create deployment on Vercel
 */
async function createDeployment(
  projectId: string,
  files: Record<string, string>,
  envVars: Record<string, string>,
  token: string
): Promise<{ id: string }> {
  // Convert files to Vercel's format
  const vercelFiles = Object.entries(files).map(([file, data]) => ({
    file,
    data: Buffer.from(data).toString('base64')
  }))

  const response = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: projectId,
      files: vercelFiles,
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'next build',
        outputDirectory: '.next'
      },
      env: Object.entries(envVars).map(([key, value]) => ({
        key,
        value,
        type: 'encrypted',
        target: ['production']
      }))
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create deployment')
  }

  return await response.json()
}

/**
 * Wait for deployment to complete and return URL
 */
async function waitForDeployment(
  deploymentId: string,
  token: string,
  maxAttempts = 60
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to check deployment status')
    }

    const deployment = await response.json()

    if (deployment.readyState === 'READY') {
      return `https://${deployment.url}`
    }

    if (deployment.readyState === 'ERROR') {
      throw new Error('Deployment failed')
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('Deployment timeout')
}

/**
 * Get user's Vercel projects
 */
export async function getUserVercelProjects(
  token: string
): Promise<VercelProject[]> {
  const response = await fetch('https://api.vercel.com/v9/projects', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Vercel projects')
  }

  const data = await response.json()
  return data.projects || []
}

/**
 * Delete Vercel project
 */
export async function deleteVercelProject(
  projectId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to delete Vercel project')
  }
}
