import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('🔍 Deploy attempt:', {
      hasSession: !!session,
      email: session?.user?.email
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { projectId, githubRepoName } = await request.json();
    
    console.log('📦 Request data:', { projectId, githubRepoName });
    
    // Get user with GitHub and Vercel credentials
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        vercelConnection: true,
      },
    });
    
    console.log('👤 User data:', {
      found: !!user,
      hasGithub: !!user?.githubAccessToken,
      hasVercel: !!user?.vercelConnection?.accessToken,
      githubUsername: user?.githubUsername
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check GitHub connection
    if (!user.githubAccessToken || !user.githubUsername) {
      return NextResponse.json({ 
        error: 'GitHub not connected',
        needsGithubAuth: true 
      }, { status: 400 });
    }
    
    // Check Vercel connection
    if (!user.vercelConnection?.accessToken) {
      return NextResponse.json({ 
        error: 'Vercel not connected',
        needsVercelAuth: true 
      }, { status: 400 });
    }
    
    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    console.log('📄 Project data:', {
      found: !!project,
      name: project?.name,
      hasFramework: !!project?.framework
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Step 1: Deploy to Vercel with correct gitSource format
    console.log('🚀 Deploying to Vercel...');
    console.log('GitHub repo:', `${user.githubUsername}/${githubRepoName}`);
    
    const deploymentPayload = {
      name: githubRepoName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      gitSource: {
        type: 'github',
        repo: `${user.githubUsername}/${githubRepoName}`,
        ref: 'main', // or 'master' depending on your default branch
      },
      projectSettings: {
        framework: project.framework || 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        installCommand: 'npm install',
      },
    };
    
    console.log('📤 Vercel API payload:', JSON.stringify(deploymentPayload, null, 2));
    
    const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.vercelConnection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentPayload),
    });
    
    const vercelData = await vercelResponse.json();
    
    console.log('📥 Vercel API response:', {
      status: vercelResponse.status,
      ok: vercelResponse.ok,
      data: vercelData
    });
    
    if (!vercelResponse.ok) {
      console.error('Vercel API Error:', vercelData);
      
      // Handle specific Vercel errors
      if (vercelData.error?.code === 'repo_not_found') {
        return NextResponse.json({ 
          error: 'GitHub repository not found. Please ensure it exists and is accessible.',
          details: vercelData.error.message
        }, { status: 400 });
      }
      
      if (vercelData.error?.code === 'invalid_request') {
        return NextResponse.json({ 
          error: 'Invalid deployment request',
          details: vercelData.error.message
        }, { status: 400 });
      }
      
      throw new Error(vercelData.error?.message || 'Vercel deployment failed');
    }
    
    console.log('✅ Vercel deployment created:', vercelData);
    
    // Step 2: Save deployment to database
    const deployment = await prisma.deployment.create({
      data: {
        userId: user.id,
        projectId: project.id,
        platform: 'vercel',
        deploymentUrl: vercelData.url ? `https://${vercelData.url}` : null,
        deploymentId: vercelData.id,
        vercelProjectId: vercelData.projectId,
        status: 'building',
      },
    });
    
    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        vercelUrl: deployment.deploymentUrl,
        deploymentId: vercelData.id,
        status: 'building',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Full deployment error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json({
      error: error.message || 'Deployment failed',
      details: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
