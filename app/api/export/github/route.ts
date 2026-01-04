import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Simple sanitization for GitHub export - remove any server-side artifacts
function sanitizeCodeForExport(code: string): string {
  if (!code) return code;
  
  // Clean up any preview-specific modifications
  let sanitized = code.trim();
  
  // Ensure 'use client' is present for React components if needed
  if (!sanitized.includes("'use client'") && !sanitized.includes('"use client"')) {
    // Add use client if it appears to be a client component
    if (sanitized.includes('useState') || 
        sanitized.includes('useEffect') || 
        sanitized.includes('onClick')) {
      sanitized = "'use client';\n\n" + sanitized;
    }
  }
  
  return sanitized;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Get user with GitHub credentials
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        githubAccessToken: true,
        githubUsername: true,
      },
    });
    
    if (!user?.githubAccessToken || !user?.githubUsername) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 400 }
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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this project' },
        { status: 403 }
      );
    }
    
    // Create a sanitized repo name from project name
    const repoName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100) || `buildflow-project-${projectId.substring(0, 8)}`;
    
    // Sanitize code before export
    const sanitizedCode = sanitizeCodeForExport(project.code || '');
    
    // Check if repo already exists
    const checkRepoResponse = await fetch(
      `https://api.github.com/repos/${user.githubUsername}/${repoName}`,
      {
        headers: {
          'Authorization': `Bearer ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    let repoUrl: string;
    
    if (checkRepoResponse.status === 200) {
      // Repo exists, we'll update it
      repoUrl = `https://github.com/${user.githubUsername}/${repoName}`;
      console.log('📦 Repository already exists:', repoUrl);
    } else {
      // Create new repository
      console.log('🆕 Creating new repository:', repoName);
      
      const createRepoResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.githubAccessToken}`,
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
      
      // After successful GitHub repo creation:
      await prisma.deployment.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          userId: user.id,
          platform: 'github',
          deploymentId: repoData.id.toString(),
          deploymentUrl: repoData.html_url,
          vercelProjectId: repoName, // IMPORTANT: Save repo name here!
          status: 'success',
          logs: JSON.stringify({
            repoUrl: repoData.html_url,
            repoName: repoName
          }),
          updatedAt: new Date()
        }
      });
    }
    
    // Create the file structure for a Next.js app
    const files = generateProjectFiles(project.name, sanitizedCode);
    
    // Create/update files in the repository
    for (const file of files) {
      await createOrUpdateFile(
        user.githubAccessToken,
        user.githubUsername,
        repoName,
        file.path,
        file.content
      );
    }
    
    console.log('✅ All files pushed to repository');
    
    return NextResponse.json({
      success: true,
      repoUrl,
      repoName,
      message: 'Project exported to GitHub successfully',
    });
    
  } catch (error: any) {
    console.error('GitHub export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export to GitHub' },
      { status: 500 }
    );
  }
}

async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string
) {
  // Check if file exists to get its SHA
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

First, install dependencies:

\`\`\`bash
npm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use [Vercel](https://vercel.com).
`,
    },
    {
      path: '.gitignore',
      content: `# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts`,
    },
  ];
}
