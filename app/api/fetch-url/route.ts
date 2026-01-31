import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting to prevent SSRF abuse
    const rateLimitResult = checkRateLimit(`fetch-url:${session.user.email}`, { maxRequests: 30, windowMs: 60000 }) // 30 per minute
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          resetIn 
        },
        { status: 429 }
      )
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Block private IP ranges to prevent SSRF attacks
    const hostname = parsedUrl.hostname.toLowerCase()
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254']
    const privateRanges = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/
    
    if (blockedHosts.includes(hostname) || privateRanges.test(hostname)) {
      return NextResponse.json({ error: 'Access to private/local URLs is not allowed' }, { status: 403 })
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BuildFlowAI/1.0)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status })
    }

    const html = await response.text()

    // Extract text content (remove scripts, styles, and HTML tags)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    return NextResponse.json({
      url,
      content: textContent,
      length: textContent.length
    })

  } catch (error: any) {
    console.error('URL fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch URL' },
      { status: 500 }
    )
  }
}
