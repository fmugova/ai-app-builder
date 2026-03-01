import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { publicSlug: slug },
    select: {
      name: true,
      description: true,
    },
  });

  if (!project) {
    return {
      title: 'App Not Found',
    };
  }

  return {
    title: project.name,
    description: project.description || `${project.name} - Built with BuildFlow AI`,
  };
}

export default async function PublishedAppPage({ params }: PageProps) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { publicSlug: slug },
    select: {
      name: true,
      code: true,
      html: true,
      htmlCode: true,
      isPublished: true,
    },
  });

  if (!project || !project.isPublished) {
    notFound();
  }

  // Use the most complete HTML available
  const htmlContent = project.htmlCode || project.html || project.code;

  if (!htmlContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Content Available</h1>
          <p className="text-gray-600">This app has no content to display.</p>
        </div>
      </div>
    );
  }

  // Sanitize user-generated HTML to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ['script', 'style', 'link'],
    ADD_ATTR: ['class', 'id', 'style', 'href', 'src', 'alt', 'title', 'data-*'],
    FORBID_TAGS: ['iframe', 'object', 'embed', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });

  // Render the sanitized HTML
  return (
    <div 
      className="min-h-screen"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
