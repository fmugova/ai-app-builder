
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hostname = request.headers.get('host') || ''

    // Check if this is a custom domain
    const customDomain = await prisma.customDomain.findFirst({
      where: {
        domain: hostname,
        status: 'active'
      },
      include: {
        Project: {
          include: {
            Page: {
              where: { isPublished: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    })

    let project
    if (customDomain) {
      // Serve project via custom domain
      project = customDomain.Project
    } else {
      // Regular buildflow.ai subdomain
      // searchParams assignment removed (unused)
      const { id } = await params
      project = await prisma.project.findUnique({
        where: { id: id as string },
        include: {
          Page: {
            where: { isPublished: true },
            orderBy: { order: 'asc' }
          }
        }
      })
    }

    if (!project) {
      return new NextResponse('Project not found', { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug') || 'home'

    // If not multi-page, return the main project code
    if (!project.multiPage || !project.Page.length) {
      return new NextResponse(project.code || '<h1>No content</h1>', {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Find the requested page
    let page = project.Page.find((p: { slug: string }) => p.slug === slug)

    // If not found, try home page
    if (!page) {
      page = project.Page.find((p: { isHomepage: boolean }) => p.isHomepage) || project.Page[0]
    }

    if (!page) {
      return new NextResponse('<h1>404 - Page Not Found</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Build navigation
    const navLinks = project.Page
      .filter((p: { isPublished: boolean }) => p.isPublished)
      .map((p: { title: string; slug: string; id: string }) => ({
        name: p.title,
        slug: p.slug,
        active: p.id === page.id
      }))

    // Use SEO fields with fallbacks
    const pageTitle = page.metaTitle || page.title
    const pageDescription = page.metaDescription || page.description || ''

    // Generate complete HTML with navigation
    const formHandlerScript = readFileSync(
      join(process.cwd(), 'public', 'buildflow-forms.js'),
      'utf-8'
    )
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="buildflow-project-id" content="${project.id}">
  <title>${pageTitle}</title>
  ${pageDescription ? `<meta name="description" content="${pageDescription}">` : ''}
  ${page.ogImage ? `<meta property="og:image" content="${page.ogImage}">` : ''}
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDescription}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <!-- Navigation -->
  <nav class="bg-white shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
          <div class="hidden sm:block sm:ml-6">
            <div class="flex space-x-4">
              ${navLinks.map((link) => `
                <a href="?slug=${link.slug}" 
                   class="px-3 py-2 rounded-md text-sm font-medium ${
                     link.active 
                       ? 'bg-purple-100 text-purple-700' 
                       : 'text-gray-700 hover:bg-gray-100'
                   }">
                  ${link.name}
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile menu -->
    <div class="sm:hidden px-2 pt-2 pb-3 space-y-1">
      ${navLinks.map((link) => `
        <a href="?slug=${link.slug}" 
           class="block px-3 py-2 rounded-md text-base font-medium ${
             link.active 
               ? 'bg-purple-100 text-purple-700' 
               : 'text-gray-700 hover:bg-gray-100'
           }">
          ${link.name}
        </a>
      `).join('')}
    </div>
  </nav>

  <!-- Page Content -->
  <main>
    ${page.content}
  </main>

  <!-- Footer -->
  <footer class="bg-gray-100 mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <p class="text-center text-gray-600 text-sm">
        Built with BuildFlow AI
      </p>
    </div>

  </footer>
  <!-- BuildFlow Form Handler (inlined) -->
  <script>${formHandlerScript}</script>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error: unknown) {
    console.error('Render error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}