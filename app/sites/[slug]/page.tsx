import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function PublishedSitePage({ params }: PageProps) {
  const { slug } = params;

  // Fetch the published project by publicSlug
  const project = await prisma.project.findFirst({
    where: {
      publicSlug: slug,
      isPublished: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      createdAt: true,
      User: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!project || !project.code) {
    notFound();
  }

  // Increment view count
  await prisma.project.update({
    where: { id: project.id },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  // Return the raw HTML directly
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{project.name || 'Published Site'}</title>
        <meta name="description" content={project.description || `${project.name} - Built with BuildFlow`} />
        <meta name="generator" content="BuildFlow" />
      </head>
      <body dangerouslySetInnerHTML={{ __html: project.code }} />
    </html>
  );
}
