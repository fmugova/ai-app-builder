import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
// Use the main rate-limit utility
import { checkRateLimit } from '@/lib/rate-limit';

// ----- Input Validation Utilities -----
function isValidOwnerOrRepo(value: string): boolean {
  // Allow only alphanumeric, dash, underscore, no empty string.
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length > 0;
}
function isValidPath(path: string): boolean {
  // Allow subdirs but no '..', no leading/trailing '/', no empty path. Block certain sensitive files explicitly.
  if (!/^[A-Za-z0-9._\-\/]+$/.test(path) || path.includes('..') || path.startsWith('/') || path.endsWith('/') || path.length === 0) {
    return false;
  }
  const forbiddenFiles = ['.env', '.htaccess', '.gitignore', '.npmrc'];
  for (const forbidden of forbiddenFiles) {
    if (path.endsWith(forbidden) || path === forbidden) return false;
  }
  return true;
}

// Simple sanitization for GitHub export - remove any server-side artifacts
function sanitizeCodeForExport(code: string): string {
  if (!code) return code;
  let sanitized = code.trim();
  if (!sanitized.includes("'use client'") && !sanitized.includes('"use client"')) {
    if (sanitized.includes('useState') || sanitized.includes('useEffect') || sanitized.includes('onClick')) {
      sanitized = "'use client';\n\n" + sanitized;
    }
  }
  return sanitized;
}

// Enhanced error handler
function handleError(error: unknown, context?: string) {
  let message = 'Unknown error';
  if (typeof error === 'object' && error !== null && 'message' in error) {
    message = (error as Error).message;
  } else if (typeof error === 'string') {
    message = error;
  }
  // Mask sensitive info for users, log technical details for admin
  if (context) {
    console.error(`[GitHub Export ERROR] ${context}:`, error);
  } else {
    console.error('[GitHub Export ERROR]:', error);
  }
  // Optionally, send to error tracking service
  return NextResponse.json(
    { error: 'A server error occurred. Please contact support.' },
    { status: 500 }
  );
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn('Missing authentication on GitHub export');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      console.warn(`User not found: ${session.user.email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const rateLimit = await checkRateLimit(request, 'external', user.id);
    if (!rateLimit.success) {
      console.warn(`Rate limit breached for user: ${user.id} (${session.user.email})`);
      return NextResponse.json(
        {
          error: 'Too many GitHub exports. Please try again later.',
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    const { projectId } = await request.json();
    if (!projectId) {
      console.warn('Missing projectId in request');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get user with GitHub credentials
    const userWithGithub = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        githubAccessToken: true,
        githubUsername: true,
      },
    });

    if (!userWithGithub?.githubAccessToken || !userWithGithub?.githubUsername) {
      console.warn(`Missing or disconnected GitHub account for user ${session.user.email}`);
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 400 }
      );
    }

    // Validate GitHub username
    if (!isValidOwnerOrRepo(userWithGithub.githubUsername)) {
      console.warn(`Invalid GitHub username attempted: ${userWithGithub.githubUsername}`);
      return NextResponse.json(
        { error: 'GitHub username is invalid.' },
        { status: 400 }
      );
    }

    // Decrypt the GitHub token
    let githubToken: string;
    try {
      githubToken = decrypt(userWithGithub.githubAccessToken);
    } catch (err) {
      console.error(`Unable to decrypt GitHub token for user ${session.user.email}`);
      return NextResponse.json(
        { error: 'GitHub connection has expired. Please disconnect and reconnect your GitHub account.', reconnect: true },
        { status: 401 }
      );
    }

    // Get the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        code: true,
        userId: true,
      },
    });

    if (!project) {
      console.warn(`Project not found: ${projectId}`);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== userWithGithub.id) {
      console.warn(`User ${session.user.email} attempted export on unauthorized project ${projectId}`);
      return NextResponse.json(
        { error: 'You do not own this project' },
        { status: 403 }
      );
    }

    // Create a sanitized repo name from project name
    const repoName = (
      project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100)
    ) || `buildflow-project-${projectId.substring(0, 8)}`;

    if (!isValidOwnerOrRepo(repoName)) {
      console.warn(`Invalid repo name generated: ${repoName}`);
      return NextResponse.json(
        { error: 'Repository name is invalid.' },
        { status: 400 }
      );
    }

    const sanitizedCode = sanitizeCodeForExport(project.code || '');

    // Check if repo already exists
    let repoUrl: string;
    try {
      const checkRepoResponse = await fetch(
        `https://api.github.com/repos/${userWithGithub.githubUsername}/${repoName}`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (checkRepoResponse.status === 200) {
        repoUrl = `https://github.com/${userWithGithub.githubUsername}/${repoName}`;
        console.log('📦 Repository already exists:', repoUrl);
      } else {
        // Create new repository
        console.log('🆕 Creating new repository:', repoName);
        const createRepoResponse = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repoName,
            description: `Created with BuildFlow - ${project.name}`,
            private: false,
            auto_init: false,
          }),
        });

        if (!createRepoResponse.ok) {
          const errorData = await createRepoResponse.json();
          console.error('❌ Failed to create repo:', errorData);
          throw new Error(errorData.message || 'Failed to create repository');
        }

        const repoData = await createRepoResponse.json();
        repoUrl = repoData.html_url;
        console.log('✅ Repository created:', repoUrl);

        await prisma.deployment.create({
          data: {
            id: crypto.randomUUID(),
            projectId,
            userId: userWithGithub.id,
            platform: 'github',
            deploymentId: repoData.id.toString(),
            deploymentUrl: repoData.html_url,
            vercelProjectId: repoName,
            status: 'success',
            logs: JSON.stringify({
              repoUrl: repoData.html_url,
              repoName: repoName
            }),
            updatedAt: new Date()
          }
        });
      }
    } catch (repoError) {
      return handleError(repoError, 'Repo creation/check');
    }

    // Create the file structure for a Next.js app
    const files = generateProjectFiles(project.name, sanitizedCode);

    // Create/update files in the repository
    for (const file of files) {
      if (!isValidPath(file.path)) {
        console.warn(`Invalid file path detected: ${file.path}`);
        throw new Error(`Invalid file path detected: ${file.path}`);
      }
      try {
        await createOrUpdateFile(
          githubToken,
          userWithGithub.githubUsername,
          repoName,
          file.path,
          file.content
        );
      } catch (fileError) {
        return handleError(fileError, `File operation for ${file.path}`);
      }
    }

    console.log(`✅ All files pushed to repository: ${repoUrl}`);
    
    // Secure response headers
    const response = NextResponse.json({
      success: true,
      repoUrl,
      repoName,
      message: 'Project exported to GitHub successfully',
    });
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Content-Security-Policy', "default-src 'none'");
    return response;

  } catch (error: unknown) {
    return handleError(error, 'POST /api/export/github');
  }
}

// ---- Secure file creation/update ----
async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string
) {
  if (!isValidOwnerOrRepo(owner) || !isValidOwnerOrRepo(repo) || !isValidPath(path)) {
    console.warn(`Invalid parameters for create/update: owner=${owner}, repo=${repo}, path=${path}`);
    throw new Error('Invalid parameters for GitHub file operation');
  }
  // Check if file exists to get its SHA
  try {
    const checkResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    let sha: string | undefined;
    if (checkResponse.status === 200) {
      const existingFile = await checkResponse.json();
      sha = existingFile.sha;
    }
    // Create or update the file
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: sha ? `Update ${path}` : `Create ${path}`,
          content: Buffer.from(content).toString('base64'),
          ...(sha && { sha }),
        }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Failed to create/update ${path}:`, errorData);
      throw new Error(`Failed to create/update ${path}: ${errorData.message}`);
    }
    console.log(`✅ ${sha ? 'Updated' : 'Created'} ${path}`);
  } catch (fileError) {
    throw fileError;
  }
}

function generateProjectFiles(projectName: string, code: string) {
  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          typescript: '^5.0.0',
          tailwindcss: '^3.4.0',
          postcss: '^8.0.0',
          autoprefixer: '^10.0.0',
        },
      }, null, 2),
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'es5',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
    },
    {
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
    },
    {
      path: 'postcss.config.js',
      content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    },
    {
      path: 'next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig`,
    },
    {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Created with BuildFlow',
}

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
}`,
    },
    {
      path: 'app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
    },
    {
      path: 'app/page.tsx',
      content: code || `export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold">${projectName}</h1>
      <p className="mt-4 text-gray-600">Created with BuildFlow</p>
    </main>
  )
}`,
    },
    {
      path: 'README.md',
      content: `# ${projectName}

Created with [BuildFlow](https://buildflow-ai.app)

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
`,
    },
  ];
}