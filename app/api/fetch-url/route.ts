import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'
// node-fetch respects http.Agent — native fetch (undici) does not,
// so ssrf-req-filter's post-DNS-resolution check only works via node-fetch.
import nodeFetch from 'node-fetch'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ssrfFilter = require('ssrf-req-filter') as (url: string) => import('http').Agent

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Only allow plain HTTP/HTTPS — blocks file://, ftp://, data://, javascript:, etc.
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upstash-backed rate limit — persists across serverless cold starts (replaces in-memory limiter)
    const rl = await checkRateLimitByIdentifier(`fetch-url:${session.user.id}`, 'external')
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      )
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      console.warn('Suspicious request: missing or malformed URL', { url, ip: request.ip });
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // 1. Parse and validate URL structure
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      console.warn('Malformed URL parsing attempt', { url, ip: request.ip });
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // 2. Enforce allowed protocols — blocks file://, ftp://, data://, javascript:, etc.
    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      console.warn('Blocked protocol in fetch-url', { protocol: parsedUrl.protocol, url, ip: request.ip });
      return NextResponse.json(
        { error: 'Only http:// and https:// URLs are allowed' },
        { status: 400 }
      )
    }

    // 3. Pre-check obvious static hostnames (belt-and-braces before agent check)
    const hostname = parsedUrl.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      console.warn('Blocked private/local hostname in fetch-url', { hostname, url, ip: request.ip });
      return NextResponse.json(
        { error: 'Access to private/local URLs is not allowed' },
        { status: 403 }
      )
    }

    // 4. Create ssrf-filter agent — performs post-DNS-resolution IP check.
    //    If the resolved IP is in any private/reserved range (RFC 1918, 169.254.x.x,
    //    link-local, loopback, ::1, fc00::/7, etc.) the agent throws before the
    //    connection is established. This closes IPv6, DNS-rebinding, and octal-IP bypasses.
    const agent = ssrfFilter(url)

    let response: Awaited<ReturnType<typeof nodeFetch>>
    try {
      response = await nodeFetch(url, {
        agent,
        headers: { 'User-Agent': 'BuildFlowAI/1.0' },
        signal: AbortSignal.timeout(10_000) as unknown as AbortSignal,
        redirect: 'follow',
        size: 5 * 1024 * 1024, // 5 MB response cap
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // ssrf-req-filter throws "Call to <ip> is blocked." for private IPs
      if (msg.includes('is blocked') || msg.includes('private')) {
        console.warn('Blocked SSRF attempt in fetch-url', { url, ip: request.ip, error: msg });
        return NextResponse.json(
          { error: 'Access to private/local URLs is not allowed' },
          { status: 403 }
        )
      }
      console.error('Fetch error in fetch-url', { url, ip: request.ip, error: msg });
      throw err
    }

    if (!response.ok) {
      console.error('Fetch failed in fetch-url', { url, status: response.status, statusText: response.statusText, ip: request.ip });
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()

    // Strip scripts, styles, and tags — return plain text only
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return NextResponse.json({ url, content: textContent, length: textContent.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch URL'
    console.error('URL fetch error:', error)
    console.warn('Malformed or suspicious fetch-url request', { error, ip: request.ip });
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
