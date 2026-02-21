import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { checkRateLimitByIdentifier } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import PreviewClient from './PreviewClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  // Await params (Next.js 15 requirement)
  const { sessionId: id } = await params;

  // Get headers for rate limiting
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const identifier = forwarded?.split(',')[0]?.trim() || realIp || id || 'anonymous';

  // Check rate limit (10 previews per minute)
  const rateLimit = await checkRateLimitByIdentifier(identifier, 'preview');

  if (!rateLimit.success) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">⏱️ Rate Limit Exceeded</h2>
          <p className="text-gray-600 mb-4">
            You&apos;ve exceeded the preview limit of {rateLimit.limit} requests per minute.
          </p>
          <p className="text-sm text-gray-500">
            Please wait a moment and try again.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Remaining requests: {rateLimit.remaining}/{rateLimit.limit}
          </p>
        </div>
      </div>
    );
  }

  let project = null;
  let dbError = false;

  try {
    // Fetch project from database with pages and files
    project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        userId: true,
        createdAt: true,
        multiPage: true,
        Page: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            content: true,
            isHomepage: true,
            order: true,
          },
        },
        ProjectFile: {
          select: {
            id: true,
            path: true,
            content: true,
            language: true,
          },
        },
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

  // Detect fullstack projects where code is raw JSON (server-side, can't render as HTML)
  const codeIsJson = !!(project?.code?.trimStart().startsWith('{') || project?.code?.trimStart().startsWith('['));
  const hasPages = (project?.Page?.length ?? 0) > 0;
  const hasFiles = (project?.ProjectFile?.length ?? 0) > 0;

  // Project has no renderable content
  if (project && !project.code && !hasPages) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Code Available</h2>
          <p className="text-gray-600">This project doesn&apos;t have any generated code yet.</p>
        </div>
      </div>
    );
  }

  // Fullstack project with no HTML pages — show deploy prompt
  if (project && codeIsJson && !hasPages) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Full-Stack Project</h2>
          <p className="text-gray-600 mb-4">
            This project uses server-side code ({hasFiles ? `${project!.ProjectFile!.length} files` : 'Next.js/Node.js'})
            and cannot be previewed as static HTML.
          </p>
          <p className="text-sm text-gray-500">
            Use the <strong>Fast Preview</strong> (WebContainer) in the builder, or deploy to Vercel for a live URL.
          </p>
        </div>
      </div>
    );
  }

  // Render preview — pass empty string for code when it's JSON so PreviewClient uses pages instead
  if (project && (project.code || hasPages)) {
    return <PreviewClient
      code={codeIsJson ? '' : (project.code ?? '')}
      projectName={project.name}
      pages={project.Page || []}
      files={project.ProjectFile || []}
      isMultiPage={project.multiPage || hasPages}
    />;
  }

  // Fallback
  notFound();
}
