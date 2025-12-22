export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { 
        id: projectId,
        userId: session.user.id 
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get Vercel connection
    const vercelConnection = await prisma.vercelConnection.findUnique({
      where: { userId: session.user.id }
    })

    if (!vercelConnection) {
      return NextResponse.json({ 
        error: 'Vercel not connected',
        needsAuth: true 
      }, { status: 400 })
    }

    // Decrypt access token
    const accessToken = decrypt(vercelConnection.accessToken)

    // Create clean deployment name (Vercel naming rules)
    const deploymentName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'buildflow-project'

    console.log('Deploying project:', { projectId, deploymentName })

    // Prepare deployment payload
    const deploymentPayload = {
      name: deploymentName,
      files: [
        {
          file: 'index.html',
          data: Buffer.from(project.code).toString('base64')
        },
        {
          file: 'package.json',
          data: Buffer.from(JSON.stringify({
            name: deploymentName,
            version: '1.0.0',
            description: project.description || 'Built with BuildFlow'
          })).toString('base64')
        }
      ],
      projectSettings: {
        framework: null,
        buildCommand: null,
        installCommand: null,
        devCommand: null,
        outputDirectory: null
      },
      target: 'production',
      gitSource: null
    }

    // Add teamId if user is part of a team
    const deployHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    if (vercelConnection.teamId) {
      deployHeaders['x-vercel-team-id'] = vercelConnection.teamId
    }

    console.log('Sending deployment request to Vercel...')

    // Create deployment on Vercel
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: deployHeaders,
      body: JSON.stringify(deploymentPayload),
    })

    const deployData = await deployResponse.json()

    console.log('Vercel response status:', deployResponse.status)

    if (!deployResponse.ok) {
      console.error('Deployment failed:', deployData)
      throw new Error(
        deployData.error?.message || 
        deployData.message || 
        'Deployment failed'
      )
    }

    console.log('Deployment created:', { 
      id: deployData.id, 
      url: deployData.url 
    })

    // Save deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        userId: session.user.id,
        platform: 'vercel',
        deploymentId: deployData.id,
        deploymentUrl: `https://${deployData.url}`,
        vercelProjectId: deployData.projectId,
        status: 'building'
      }
    })

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        deploymentId: deployData.id,
        url: deployment.deploymentUrl,
        status: deployment.status,
        vercelUrl: `https://vercel.com/${vercelConnection.username}/${deploymentName}`
      }
    })
  } catch (error: any) {
    console.error('Deploy error:', error)
    
    // Log deployment failure
    try {
      const body = await request.json()
      const { projectId } = body
      const session = await getServerSession(authOptions)
      
      if (session?.user?.id && projectId) {
        await prisma.deployment.create({
          data: {
            projectId,
            userId: session.user.id,
            platform: 'vercel',
            status: 'error',
            errorMessage: error.message
          }
        })
      }
    } catch (e) {
      console.error('Failed to log deployment error:', e)
    }

    return NextResponse.json({ 
      error: error.message || 'Deployment failed' 
    }, { status: 500 })
  }
}
