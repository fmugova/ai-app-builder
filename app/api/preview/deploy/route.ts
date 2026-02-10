/**
 * Preview Deployment API
 * 
 * Creates temporary Vercel deployments for previewing full-stack Next.js apps
 * Deployments are ephemeral and expire after 24 hours
 * 
 * Location: app/api/preview/deploy/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Vercel API client
const VERCEL_API_URL = 'https://api.vercel.com'
const VERCEL_TOKEN = process.env.VERCEL_TOKEN // Your Vercel token

interface VercelFile {
  file: string
  data: string
}

interface DeploymentResponse {
  url: string
  deploymentId: string
  readyState: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get request body
    const { projectId, files } = await request.json()

    if (!projectId || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // 3. Verify project ownership
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 4. Check if VERCEL_TOKEN is configured
    if (!VERCEL_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel deployment not configured. Please add VERCEL_TOKEN to environment variables.' },
        { status: 503 }
      )
    }

    // 5. Check if preview already exists (< 1 hour old)
    const existingPreview = await prisma.preview.findFirst({
      where: {
        projectId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
        status: 'READY',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (existingPreview && existingPreview.url) {
      // Return existing preview (cached)
      return NextResponse.json({
        url: existingPreview.url,
        cached: true,
      })
    }

    // 6. Prepare files for Vercel deployment
    const vercelFiles = prepareFilesForVercel(files)

    // 7. Create Vercel deployment
    const deployment = await createVercelDeployment(
      project.name,
      vercelFiles,
      session.user.id
    )

    // 8. Save preview to database
    await prisma.preview.create({
      data: {
        projectId,
        url: deployment.url,
        deploymentId: deployment.deploymentId,
        status: 'READY',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // 9. Return preview URL
    return NextResponse.json({
      url: deployment.url,
      deploymentId: deployment.deploymentId,
      cached: false,
    })

  } catch (error) {
    console.error('Preview deployment error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Deployment failed',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Prepare files for Vercel deployment format
 */
function prepareFilesForVercel(
  files: Array<{ path: string; content: string }>
): VercelFile[] {
  return files.map(file => ({
    file: file.path,
    data: Buffer.from(file.content).toString('base64'),
  }))
}

/**
 * Create deployment on Vercel
 */
async function createVercelDeployment(
  projectName: string,
  files: VercelFile[],
  userId: string
): Promise<DeploymentResponse> {
  const deploymentName = `preview-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${Date.now()}`

  const response = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: deploymentName,
      files,
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
      },
      target: 'production',
      // Metadata for tracking
      meta: {
        buildflowUserId: userId,
        type: 'preview',
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Vercel deployment failed: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()

  // Wait for deployment to be ready (with timeout)
  const readyUrl = await waitForDeployment(data.id, 120000) // 2 min timeout

  return {
    url: readyUrl || `https://${data.url}`,
    deploymentId: data.id,
    readyState: data.readyState,
  }
}

/**
 * Wait for Vercel deployment to be ready
 */
async function waitForDeployment(
  deploymentId: string,
  timeout: number = 120000
): Promise<string | null> {
  const startTime = Date.now()
  const checkInterval = 3000 // Check every 3 seconds

  while (Date.now() - startTime < timeout) {
    const response = await fetch(
      `${VERCEL_API_URL}/v13/deployments/${deploymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    if (!response.ok) {
      console.warn('Failed to check deployment status')
      return null
    }

    const deployment = await response.json()

    if (deployment.readyState === 'READY') {
      return `https://${deployment.url}`
    }

    if (deployment.readyState === 'ERROR') {
      throw new Error('Deployment failed')
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  // Timeout - return URL anyway (might still work)
  return null
}
