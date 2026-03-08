import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';

// Allow only alphanumeric, dash, underscore — prevents path-traversal / SSRF via username injection
function isValidOwnerOrRepo(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length > 0 && value.length <= 100;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    // Rate limit: 10 GitHub deploys per 10 minutes per user
    const rateLimit = await checkRateLimit(req, 'external', session.user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many GitHub deployments. Please try again later.', remaining: rateLimit.remaining },
        { status: 429 }
      );
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get user with GitHub credentials
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, githubAccessToken: true, githubUsername: true },
    });

    if (!user?.githubAccessToken || !user?.githubUsername) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 400 }
      );
    }

    // Validate stored username — guards URL construction below against injection
    if (!isValidOwnerOrRepo(user.githubUsername)) {
      return NextResponse.json(
        { error: 'GitHub username is invalid. Please reconnect your GitHub account.' },
        { status: 400 }
      );
    }

    // Decrypt token — handle stale tokens encrypted with old key
    let githubToken: string;
    try {
      githubToken = decrypt(user.githubAccessToken);
    } catch {
      return NextResponse.json(
        { error: 'GitHub connection has expired. Please disconnect and reconnect your GitHub account.', reconnect: true },
        { status: 401 }
      );
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Derive repo name from project name
    const repoName = (project.name || `buildflow-${projectId.slice(0, 8)}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100) || `buildflow-${projectId.slice(0, 8)}`;

    const ghHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // 1. Create repo if it doesn't exist
    // lgtm[js/ssrf] — URL is hardcoded to api.github.com; owner/repo validated by isValidOwnerOrRepo above
    const checkRes = await fetch(
      `https://api.github.com/repos/${user.githubUsername}/${repoName}`,
      { headers: ghHeaders }
    );

    if (checkRes.status !== 200) {
      // lgtm[js/ssrf] — hardcoded GitHub API endpoint; no user-controlled host
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({
          name: repoName,
          description: `Built with BuildFlow — ${project.name}`,
          private: false,
          auto_init: false,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || 'Failed to create repository');
      }
    }

    // 2. Push index.html with the project code
    const htmlContent = project.code || project.htmlCode || '';
    if (!htmlContent) {
      return NextResponse.json({ error: 'Project has no HTML content to deploy' }, { status: 400 });
    }

    await createOrUpdateFile(ghHeaders, user.githubUsername, repoName, 'index.html', htmlContent);

    // 3. Enable GitHub Pages on the main branch
    // lgtm[js/ssrf] — hardcoded api.github.com; owner/repo validated above
    const pagesRes = await fetch(
      `https://api.github.com/repos/${user.githubUsername}/${repoName}/pages`,
      {
        method: 'POST',
        headers: { ...ghHeaders, Accept: 'application/vnd.github+json' },
        body: JSON.stringify({ source: { branch: 'main', path: '/' } }),
      }
    );

    // 422 = Pages already enabled — that's fine
    let pagesUrl = `https://${user.githubUsername}.github.io/${repoName}/`;
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      pagesUrl = pagesData.html_url || pagesUrl;
    }

    // 4. Record deployment (find existing or create new)
    const existingDeployment = await prisma.deployment.findFirst({
      where: { projectId, platform: 'github-pages' },
    });
    if (existingDeployment) {
      await prisma.deployment.update({
        where: { id: existingDeployment.id },
        data: { deploymentUrl: pagesUrl, status: 'success', logs: JSON.stringify({ repoName, pagesUrl }), updatedAt: new Date() },
      });
    } else {
      await prisma.deployment.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          userId: user.id,
          platform: 'github-pages',
          deploymentId: repoName,
          deploymentUrl: pagesUrl,
          vercelProjectId: repoName,
          status: 'success',
          logs: JSON.stringify({ repoName, pagesUrl }),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      url: pagesUrl,
      repoUrl: `https://github.com/${user.githubUsername}/${repoName}`,
      repoName,
      message: 'Deployed to GitHub Pages successfully! It may take a few minutes to go live.',
    });
  } catch (error) {
    console.error('GitHub deploy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deploy to GitHub' },
      { status: 500 }
    );
  }
}

async function createOrUpdateFile(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  path: string,
  content: string
) {
  // lgtm[js/ssrf] — hardcoded api.github.com; owner/repo validated by isValidOwnerOrRepo before this call
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );
  const sha = checkRes.status === 200 ? (await checkRes.json()).sha : undefined;

  // lgtm[js/ssrf] — hardcoded api.github.com; owner/repo validated by isValidOwnerOrRepo before this call
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: sha ? `Update ${path} via BuildFlow` : `Create ${path} via BuildFlow`,
        content: Buffer.from(content).toString('base64'),
        ...(sha && { sha }),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to push ${path}: ${err.message}`);
  }
}
