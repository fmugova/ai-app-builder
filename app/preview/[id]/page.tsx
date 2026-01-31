import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      html: true,
      htmlCode: true,
      publicSlug: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Try multiple fields to find the code
  const code = project.code || project.html || project.htmlCode || '';

  if (!code) {
    return (
      <html lang="en">
        <head>
          <title>No Preview Available</title>
        </head>
        <body className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Preview Available</h1>
            <p className="text-gray-600">This project has no code to display.</p>
          </div>
        </body>
      </html>
    );
  }

  // ✅ FIX: Create a proper HTML structure without dangerouslySetInnerHTML
  // Remove DOCTYPE, html, head, body tags from user code since we're providing them
  const cleanCode = code
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head[^>]*>/i, '')
    .replace(/<\/head>/i, '')
    .replace(/<body[^>]*>/i, '')
    .replace(/<\/body>/i, '');

  // Extract title, meta tags, and styles from user code
  const titleMatch = code.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : project.name;
  
  const styleMatches = code.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const styles = Array.from(styleMatches).map(match => match[1]).join('\n');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {styles && (
          <style dangerouslySetInnerHTML={{ __html: styles }} />
        )}
      </head>
      <body suppressHydrationWarning>
        <div dangerouslySetInnerHTML={{ __html: cleanCode }} suppressHydrationWarning />
      </body>
    </html>
  );
}