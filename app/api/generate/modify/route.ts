// app/api/generate/modify/route.ts
// Partial regeneration — regenerates only the file(s) affected by a user's
// modification request, leaving the rest of the site unchanged.
//
// Examples:
//   "fix the login page"          → regenerates login.html only
//   "add a pricing page"          → generates pricing.html (new)
//   "change the colour scheme"    → regenerates style.css only
//   "regenerate everything"       → regenerates all HTML pages

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

export const maxDuration = 120;

const anthropic = new Anthropic();

const SIMPLE_PAGE_SLUGS = new Set([
  'login', 'signup', 'register', 'contact', 'about',
  'error', '404', 'terms', 'privacy', 'faq',
]);

// ── Target-file detection ─────────────────────────────────────────────────────

function determineTargetFiles(
  request: string,
  existingFiles: Record<string, string>
): string[] {
  const lower = request.toLowerCase();
  const htmlFiles = Object.keys(existingFiles).filter(
    (f) => f.endsWith('.html') && !f.startsWith('_')
  );

  // "add / create a [x] page" → new page
  const addMatch = lower.match(
    /\b(?:add|create|generate|build|make)\s+(?:a\s+|an\s+|new\s+)?(.+?)\s+page\b/
  );
  if (addMatch) {
    const slug = addMatch[1].trim().replace(/\s+/g, '-').toLowerCase();
    return [`${slug}.html`];
  }

  // Explicit page slug/name mention ("fix the login page", "redo about")
  for (const file of htmlFiles) {
    const slug = file.replace('.html', '');
    const words = slug.replace(/-/g, ' ');
    if (lower.includes(slug) || (slug !== 'index' && lower.includes(words))) {
      return [file];
    }
  }

  // "home page" → index.html
  if (/\bhome(\s+page)?\b/.test(lower) || lower.includes('index')) {
    if (existingFiles['index.html']) return ['index.html'];
  }

  // Style / visual changes
  if (
    /\b(style|css|color|colour|design|theme|font|appearance|visual|spacing|layout)\b/.test(
      lower
    )
  ) {
    return ['style.css'];
  }

  // Nav / header / footer
  if (/\b(nav|navigation|menu|header|footer)\b/.test(lower)) {
    return htmlFiles; // nav is embedded in every page; regen them all
  }

  // "all" / "everything"
  if (/\b(all|every|entire|whole|all pages|redo)\b/.test(lower)) {
    return htmlFiles;
  }

  // Default: regenerate all pages
  return htmlFiles;
}

// ── Per-file generation ───────────────────────────────────────────────────────

async function generateModifiedFile(
  filename: string,
  modifyRequest: string,
  existingFiles: Record<string, string>,
  siteName: string,
  projectId: string
): Promise<string> {
  const isHtml = filename.endsWith('.html');
  const isStyleFile = filename === 'style.css';

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (isStyleFile) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `Update the stylesheet for "${siteName}".

User request: ${modifyRequest}

Current style.css:
${existingFiles['style.css'] ?? '/* empty */'}

Return ONLY the updated CSS file. No explanation.`,
        },
      ],
    });
    return response.content.find((b) => b.type === 'text')?.text ?? '';
  }

  // ── HTML page ────────────────────────────────────────────────────────────
  if (isHtml) {
    const slug = filename.replace('.html', '');
    const pageName =
      slug === 'index'
        ? 'Home'
        : slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

    const currentContent = existingFiles[filename];
    const isNewPage = !currentContent;
    const model =
      SIMPLE_PAGE_SLUGS.has(slug.toLowerCase())
        ? 'claude-haiku-4-5-20251001'
        : 'claude-sonnet-4-6';
    const maxTokens = SIMPLE_PAGE_SLUGS.has(slug.toLowerCase()) ? 4000 : 12000;

    const existingPageList = Object.keys(existingFiles)
      .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
      .map((f) => `- ${f}`)
      .join('\n');

    let content: string;

    if (isNewPage) {
      // ── New page: match existing design ──────────────────────────────────
      const sampleHtml =
        Object.entries(existingFiles).find(
          ([f]) => f.endsWith('.html') && !f.startsWith('_') && f !== filename
        )?.[1] ?? '';

      const navBlock = sampleHtml.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? '';
      const footerBlock =
        sampleHtml.match(/<footer[\s\S]*?<\/footer>/i)?.[0] ?? '';
      const headBlock =
        (sampleHtml.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? '').slice(0, 1200);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 12000,
        messages: [
          {
            role: 'user',
            content: `Create a new "${pageName}" page (${filename}) for the website "${siteName}".

User request: ${modifyRequest}

Existing pages in this site:
${existingPageList}

Match the exact visual style of the site. Use the same nav and footer as below.

NAVIGATION (copy verbatim, mark "${pageName}" link as active):
${navBlock || '<!-- create a matching nav -->'}

FOOTER (copy verbatim):
${footerBlock || '<!-- create a matching footer -->'}

HEAD reference (include same CDN/stylesheet links):
${headBlock || '<script src="https://cdn.tailwindcss.com"></script>'}

Return ONLY the complete <!DOCTYPE html> document. No explanation.`,
          },
        ],
      });
      content = response.content.find((b) => b.type === 'text')?.text ?? '';
    } else {
      // ── Existing page: apply targeted change ─────────────────────────────
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: `Modify the "${pageName}" page (${filename}) for "${siteName}".

User request: ${modifyRequest}

Current page HTML:
${currentContent}

Return ONLY the complete updated <!DOCTYPE html> document with the requested changes applied. Preserve the overall design, nav, and footer unchanged. No explanation.`,
          },
        ],
      });
      content = response.content.find((b) => b.type === 'text')?.text ?? '';
    }

    // Inject real project ID (replaces the BUILDFLOW_PROJECT_ID placeholder
    // that the AI may have used for form actions / auth endpoints)
    content = content.replace(/BUILDFLOW_PROJECT_ID/g, projectId);

    return content;
  }

  // Fallback: return unchanged
  return existingFiles[filename] ?? '';
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { projectId: string; modifyRequest: string; currentFiles: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { projectId, modifyRequest, currentFiles } = body;

  if (!projectId || !modifyRequest?.trim()) {
    return new Response('Missing projectId or modifyRequest', { status: 400 });
  }

  // Verify the calling user owns this project
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: token.sub },
    include: {
      Page: {
        where: { isPublished: true },
        select: { slug: true, isHomepage: true, content: true },
      },
    },
  });

  if (!project) {
    return new Response('Project not found', { status: 404 });
  }

  // Merge DB pages into the client-side files (DB is authoritative for saved pages)
  const mergedFiles: Record<string, string> = { ...currentFiles };
  for (const page of project.Page ?? []) {
    const filename = page.isHomepage ? 'index.html' : `${page.slug}.html`;
    if (!mergedFiles[filename] && page.content) {
      mergedFiles[filename] = page.content;
    }
  }

  const targetFiles = determineTargetFiles(modifyRequest, mergedFiles);

  // ── SSE stream ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      }

      try {
        for (const targetFile of targetFiles) {
          send('status', { message: `Regenerating ${targetFile}…` });

          const newContent = await generateModifiedFile(
            targetFile,
            modifyRequest,
            mergedFiles,
            project.name,
            projectId
          );

          if (!newContent.trim()) {
            send('status', {
              message: `Skipped ${targetFile} (no content returned)`,
            });
            continue;
          }

          send('file', { path: targetFile, content: newContent });

          // Update local map so subsequent page generations see the latest
          mergedFiles[targetFile] = newContent;

          // Persist HTML pages to DB so republish picks up the change
          if (targetFile.endsWith('.html') && !targetFile.startsWith('_')) {
            const slug = targetFile.replace('.html', '');
            const isHomepage = targetFile === 'index.html';
            try {
              await prisma.page.upsert({
                where: { projectId_slug: { projectId, slug } },
                update: { content: newContent },
                create: {
                  projectId,
                  slug,
                  title:
                    slug === 'index'
                      ? 'Home'
                      : slug.charAt(0).toUpperCase() +
                        slug.slice(1).replace(/-/g, ' '),
                  content: newContent,
                  isHomepage,
                  isPublished: true,
                  order: isHomepage ? 0 : 99,
                },
              });
            } catch {
              /* non-fatal — DB update failure shouldn't break the UI */
            }
          }
        }

        send('done', { targetFiles });
      } catch (e) {
        send('error', {
          message: e instanceof Error ? e.message : 'Modification failed',
        });
      } finally {
        closed = true;
        controller.close();
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
