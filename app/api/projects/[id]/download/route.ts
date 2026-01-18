import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create ZIP
    const zip = new JSZip();

    // Add package.json
    const packageJson = {
      name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject'
      },
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '^5.0.1'
      },
      eslintConfig: {
        extends: ['react-app']
      },
      browserslist: {
        production: ['>0.2%', 'not dead', 'not op_mini all'],
        development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
      }
    };
    zip.file('package.json', JSON.stringify(packageJson, null, 2));

    // Add README
    const readmeContent = `# ${project.name}

${project.description || 'No description provided'}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
\`\`\`

## About

This project was generated with [BuildFlow AI](https://buildflow-ai.app).

Created: ${new Date(project.createdAt).toLocaleDateString()}
`;
    zip.file('README.md', readmeContent);

    // Add .gitignore
    zip.file('.gitignore', `node_modules
build
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*`);

    // Add public/index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#000000" />
  <meta name="description" content="${project.description || project.name}" />
  <title>${project.name}</title>
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
</body>
</html>`;
    zip.file('public/index.html', indexHtml);

    // Add src/App.jsx
    zip.file('src/App.jsx', project.code);

    // Add src/index.jsx
    const indexJsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    zip.file('src/index.jsx', indexJsx);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return ZIP file
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-z0-9-]/gi, '-')}.zip"`
      }
    });

  } catch (error: unknown) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to create ZIP file' },
      { status: 500 }
    );
  }
}