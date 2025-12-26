import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, githubRepoName } = await request.json();

    // CRITICAL: Require GitHub repo
    if (!githubRepoName) {
      return NextResponse.json(
        { 
          error: 'GitHub repository required',
          message: 'Please export your project to GitHub first before deploying to Vercel.'
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        vercelConnection: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check Vercel connection
    if (!user.vercelConnection) {
      return NextResponse.json(
        { 
          error: 'Vercel not connected', 
          needsVercelAuth: true,
          message: 'Please connect your Vercel account in Settings first.'
        },
        { status: 400 }
      );
    }

    // Check GitHub connection
    if (!user.githubAccessToken || !user.githubUsername) {
      return NextResponse.json(
        { 
          error: 'GitHub not connected',
          needsGithubAuth: true,
          message: 'Please connect your GitHub account in Settings first.'
        },
        { status: 400 }
      );
    }

    console.log('🚀 Deploying to Vercel:', {
      repo: `${user.githubUsername}/${githubRepoName}`,
      projectId
    });

    // Create Vercel deployment from GitHub repo
    const vercelRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.vercelConnection.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: githubRepoName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        gitSource: {
          type: 'github',
          repo: `${user.githubUsername}/${githubRepoName}`,
          ref: 'main'
        },
        projectSettings: {
          framework: 'react',
          buildCommand: 'npm run build',
          installCommand: 'npm install',
          outputDirectory: 'build'
        }
      })
    });

    if (!vercelRes.ok) {
      const errorText = await vercelRes.text();
      console.error('Vercel API error:', errorText);
      
      let errorMessage = 'Vercel deployment failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        // Keep default message
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorText 
        },
        { status: 500 }
      );
    }

    const deployment = await vercelRes.json();

    console.log('✅ Vercel deployment created:', deployment);

    // Save deployment record
    const dbDeployment = await prisma.deployment.create({
      data: {
        projectId,
        userId: user.id,
        platform: 'vercel',
        deploymentId: deployment.id,
        deploymentUrl: `https://${deployment.url}`,
        vercelProjectId: githubRepoName,
        status: 'pending',
        logs: JSON.stringify({
          githubRepo: `${user.githubUsername}/${githubRepoName}`,
          vercelUrl: deployment.url,
          deploymentId: deployment.id
        })
      }
    });

    return NextResponse.json({
      success: true,
      deploymentUrl: `https://${deployment.url}`,
      deployment: {
        id: deployment.id,
        url: deployment.url,
        vercelUrl: `https://${deployment.url}`,
        status: deployment.readyState || 'BUILDING'
      }
    });

  } catch (error: any) {
    console.error('Vercel deploy error:', error);
    return NextResponse.json(
      { 
        error: 'Deployment failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
