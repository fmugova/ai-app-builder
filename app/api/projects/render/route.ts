import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Render project content for custom domains
 * This endpoint is called by middleware when a custom domain is accessed
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit check (10 renders per minute per IP)
    const rateLimit = await checkRateLimit(request, 'preview');
    if (!rateLimit.success) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Rate Limit Exceeded</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 1rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
              }
              h1 { color: #333; margin: 0 0 1rem 0; }
              p { color: #666; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⏱️ Rate Limit Exceeded</h1>
              <p>Too many preview requests. Please wait ${Math.ceil((rateLimit.reset - Date.now()) / 1000)} seconds.</p>
              <p style="font-size: 0.875rem; color: #999;">Limit: ${rateLimit.limit} requests per minute</p>
            </div>
          </body>
        </html>
        `,
        { 
          status: 429,
          headers: {
            'Content-Type': 'text/html',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const path = searchParams.get('path') || '/'

    if (!domain) {
      return new NextResponse('Domain not specified', { status: 400 })
    }

    // Find the custom domain and associated project
    const customDomain = await prisma.customDomain.findFirst({
      where: {
        domain,
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

    if (!customDomain) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Domain Not Configured</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                padding: 20px;
              }
              .container {
                max-width: 600px;
              }
              h1 {
                font-size: 3rem;
                margin: 0 0 1rem 0;
              }
              p {
                font-size: 1.25rem;
                opacity: 0.9;
              }
              .code {
                background: rgba(255,255,255,0.1);
                padding: 0.5rem 1rem;
                border-radius: 8px;
                font-family: monospace;
                margin: 1rem 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🌐</h1>
              <h1>Domain Not Configured</h1>
              <p>The domain <span class="code">${domain}</span> is not connected to any project.</p>
              <p style="margin-top: 2rem; font-size: 1rem;">
                If you own this domain, please configure it in your BuildFlow dashboard.
              </p>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    const project = customDomain.Project

    // Find the appropriate page based on the path
    // Convert path to slug (remove leading slash)
    const slug = path === '/' ? 'home' : path.replace(/^\//, '')
    let page = project.Page.find(p => p.slug === slug)
    
    // If no exact match, try home page or homepage flag
    if (!page) {
      page = project.Page.find(p => p.isHomepage || p.slug === 'home' || p.slug === 'index')
    }

    // If still no page, use the first published page
    if (!page && project.Page.length > 0) {
      page = project.Page[0]
    }

    if (!page) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>No Content</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f7fafc;
                text-align: center;
                padding: 20px;
              }
              .container {
                max-width: 600px;
              }
              h1 {
                font-size: 2.5rem;
                color: #2d3748;
                margin: 0 0 1rem 0;
              }
              p {
                font-size: 1.125rem;
                color: #4a5568;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📄</h1>
              <h1>No Published Pages</h1>
              <p>This project doesn't have any published pages yet.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    // Render the page content
    // If content is full HTML, use it directly; otherwise wrap it
    let html = page.content || ''
    
    // Check if content is already a full HTML document
    if (!html.toLowerCase().includes('<!doctype') && !html.toLowerCase().includes('<html')) {
      // Wrap partial content in a full HTML document
      html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${page.metaTitle || page.title || project.name}</title>
            <meta name="description" content="${page.metaDescription || page.description || project.description || ''}" />
            ${page.ogImage ? `<meta property="og:image" content="${page.ogImage}" />` : ''}
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
            </style>
          </head>
          <body>
            ${html || '<div style="padding: 2rem; text-align: center;"><h1>Welcome to ' + project.name + '</h1></div>'}
          </body>
        </html>
      `
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })

  } catch (error) {
    console.error('Custom domain render error:', error)
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #fee;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 600px;
            }
            h1 {
              font-size: 2.5rem;
              color: #c53030;
              margin: 0 0 1rem 0;
            }
            p {
              font-size: 1.125rem;
              color: #742a2a;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️</h1>
            <h1>Server Error</h1>
            <p>An error occurred while loading this page. Please try again later.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}
