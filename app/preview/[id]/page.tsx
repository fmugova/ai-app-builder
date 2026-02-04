import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PreviewClient from './PreviewClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  // Await params (Next.js 15 requirement)
  const { id } = await params;

  let project = null;
  let dbError = false;

  try {
    // Fetch project from database
    project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        userId: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('Error loading preview:', error);
    if (error instanceof Error && error.message.includes('Prisma')) {
      dbError = true;
    } else {
      notFound();
    }
  }

  // Project not found
  if (!project && !dbError) {
    notFound();
  }

  // Database error
  if (dbError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Database Error</h2>
          <p className="text-gray-600">Unable to load project. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Project has no code
  if (project && !project.code) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Code Available</h2>
          <p className="text-gray-600">This project doesn&apos;t have any generated code yet.</p>
        </div>
      </div>
    );
  }

  // Render preview
  if (project && project.code) {
    return <PreviewClient code={project.code} projectName={project.name} />;
  }

  // Fallback
  notFound();
}