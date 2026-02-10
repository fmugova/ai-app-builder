import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deployToVercel } from '@/lib/vercel-deploy'
import { provisionSupabaseDatabase } from '@/lib/supabase-auto-setup'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const autoDeploySchema = z.object({
  projectId: z.string().cuid(),
  includeDatabase: z.boolean().default(false),
  databaseSchema: z.array(z.object({
    name: z.string(),
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean().optional(),
      unique: z.boolean().optional(),
      primaryKey: z.boolean().optional(),
      defaultValue: z.any().optional(),
    })),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        VercelConnection: true,
        SupabaseIntegration: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has connected Vercel
    if (!user.VercelConnection?.accessToken) {
      return NextResponse.json(
        { error: 'Please connect your Vercel account first', requiresVercelAuth: true },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = autoDeploySchema.parse(body)

    // Get the project with explicit type
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      include: {
        ApiEndpoint: true,
        DatabaseConnection: {
          include: {
            DatabaseTable: true,
          },
        },
      },
    }) as ProjectWithRelations | null

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify user owns the project
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to deploy this project' },
        { status: 403 }
      )
    }

    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        userId: user.id,
        platform: 'vercel',
        status: 'deploying',
      },
    })

    // Start deployment process in background
    deployProjectInBackground(
      deployment.id,
      project,
      user.VercelConnection.accessToken,
      user.SupabaseIntegration?.accessToken,
      validatedData
    ).catch(async (error) => {
      console.error('Deployment failed:', error)
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          logs: error.stack,
        },
      })
    })

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      status: 'deploying',
      message: 'Deployment started. This may take 3-5 minutes.',
    })
  } catch (error: unknown) {
    console.error('Auto-deploy error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to start deployment', message },
      { status: 500 }
    )
  }
}

// Define type at the top level for proper inference
type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    ApiEndpoint: true
    DatabaseConnection: {
      include: { DatabaseTable: true }
    }
  }
}>

async function deployProjectInBackground(
  deploymentId: string,
  project: ProjectWithRelations,
  vercelToken: string,
  supabaseToken: string | undefined,
  config: z.infer<typeof autoDeploySchema>
) {
  try {
    if (!project) {
      throw new Error('Project is required for deployment')
    }

    let supabaseDetails = null

    // Step 1: Provision Supabase database if requested
    if (config.includeDatabase && supabaseToken && config.databaseSchema) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'provisioning_database',
          logs: 'Creating Supabase database...',
        },
      })

      supabaseDetails = await provisionSupabaseDatabase(
        `${project.name}-db`,
        { tables: config.databaseSchema },
        supabaseToken
      )

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          supabaseProjectId: supabaseDetails.project?.id,
          supabaseUrl: supabaseDetails.project?.url,
          supabaseAnonKey: supabaseDetails.project?.anonKey,
          supabaseServiceKey: supabaseDetails.project?.serviceKey,
          databasePassword: supabaseDetails.project?.database.host,
          logs: 'Database provisioned successfully',
        },
      })
    }

    // Step 2: Deploy to Vercel
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'deploying_vercel',
        logs: 'Deploying to Vercel...',
      },
    })

    const envVars: Record<string, string> = {}

    // Add Supabase environment variables if database was provisioned
    if (supabaseDetails?.project) {
      envVars.NEXT_PUBLIC_SUPABASE_URL = supabaseDetails.project.url
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseDetails.project.anonKey
      envVars.SUPABASE_SERVICE_KEY = supabaseDetails.project.serviceKey
      envVars.DATABASE_URL = `postgresql://postgres:${supabaseDetails.project.database.host}@db.${supabaseDetails.project.id}.supabase.co:5432/postgres`
    }

    const vercelResult = await deployToVercel(
      {
        projectId: project.id,
        projectName: project.name,
        html: project.html || '',
        css: project.css ?? undefined,
        javascript: project.javascript ?? undefined,
        apiEndpoints: project.ApiEndpoint.map((endpoint) => ({
          path: endpoint.path,
          method: endpoint.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
          code: endpoint.code,
        })),
        envVars,
      },
      vercelToken
    )

    // Step 3: Update deployment with success
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'success',
        deploymentUrl: vercelResult.deploymentUrl,
        vercelProjectId: vercelResult.vercelProjectId,
        deployedAt: new Date(),
        buildTime: Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 1000),
        logs: 'Deployment completed successfully',
      },
    })

    // Update project with deployment URL
    await prisma.project.update({
      where: { id: project.id },
      data: {
        publicUrl: vercelResult.deploymentUrl,
        updatedAt: new Date(),
      },
    })
  } catch (error: unknown) {
    console.error('Background deployment error:', error)
    throw error
  }
}

// GET endpoint to check deployment status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const deploymentId = searchParams.get('deploymentId')

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID required' },
        { status: 400 }
      )
    }

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      )
    }

    // Verify user owns the deployment
    if (deployment.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this deployment' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        status: deployment.status,
        deploymentUrl: deployment.deploymentUrl,
        errorMessage: deployment.errorMessage,
        logs: deployment.logs,
        createdAt: deployment.createdAt,
        deployedAt: deployment.deployedAt,
        buildTime: deployment.buildTime,
        project: deployment.Project,
      },
    })
  } catch (error: unknown) {
    console.error('Get deployment status error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to get deployment status', message },
      { status: 500 }
    )
  }
}
