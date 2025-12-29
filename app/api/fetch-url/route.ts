import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
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