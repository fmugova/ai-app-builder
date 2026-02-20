import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'
import nodeFetch from 'node-fetch'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ssrfFilter = require('ssrf-req-filter') as (url: string) => import('http').Agent

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const FORBIDDEN_HOSTS = ['localhost', '0.0.0.0', '127.0.0.1', '::1']

function isValidUrlInput(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 3000) return false;
  // Explicitly block encoded localhost/127.0.0.1 variants
  if (/localhost|127\.0\.0\.1|::1/i.test(decodeURIComponent(url))) return false;
  return true;
}

function handleError(error: unknown, context?: string) {
  let message = 'Unknown error';
  if (typeof error === 'object' && error !== null && 'message' in error) message = (error as Error).message;
  else if (typeof error === 'string') message = error;
  if (context) console.error(`[Fetch URL ERROR] ${context}:`, error);
  else console.error('[Fetch URL ERROR]:', error);
  return NextResponse.json({ error: 'A server error occurred. Please contact support.' }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
<<<<<<< HEAD

    if (!url || typeof url !== 'string') {
      console.warn('Suspicious request: missing or malformed URL', { url, ip: request.ip });
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
=======
    if (!isValidUrlInput(url)) {
      console.warn(`[Invalid URL] User: ${session.user.id} URL: ${url}`)
      return NextResponse.json({ error: 'URL is required and must be valid.' }, { status: 400 })
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
    }
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
<<<<<<< HEAD
      console.warn('Malformed URL parsing attempt', { url, ip: request.ip });
=======
      console.warn(`[Malformed URL] User: ${session.user.id} URL: ${url}`)
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
<<<<<<< HEAD
      console.warn('Blocked protocol in fetch-url', { protocol: parsedUrl.protocol, url, ip: request.ip });
      return NextResponse.json(
        { error: 'Only http:// and https:// URLs are allowed' },
        { status: 400 }
      )
=======
      console.warn(`[Forbidden protocol] User: ${session.user.id} Protocol: ${parsedUrl.protocol}`)
      return NextResponse.json({ error: 'Only http:// and https:// URLs are allowed' }, { status: 400 })
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
    }
    const hostname = parsedUrl.hostname.toLowerCase()
<<<<<<< HEAD
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      console.warn('Blocked private/local hostname in fetch-url', { hostname, url, ip: request.ip });
      return NextResponse.json(
        { error: 'Access to private/local URLs is not allowed' },
        { status: 403 }
      )
=======
    if (FORBIDDEN_HOSTS.includes(hostname)) {
      console.warn(`[Blocked hostname] User: ${session.user.id} Hostname: ${hostname}`)
      return NextResponse.json({ error: 'Access to private/local URLs is not allowed' }, { status: 403 })
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
    }
    const agent = ssrfFilter(url)
    let response: Awaited<ReturnType<typeof nodeFetch>>
    try {
      response = await nodeFetch(url, {
        agent,
        headers: { 'User-Agent': 'BuildFlowAI/1.0' },
        signal: AbortSignal.timeout(10_000) as unknown as AbortSignal,
        redirect: 'follow',
        size: 5 * 1024 * 1024,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('is blocked') || msg.includes('private')) {
<<<<<<< HEAD
        console.warn('Blocked SSRF attempt in fetch-url', { url, ip: request.ip, error: msg });
        return NextResponse.json(
          { error: 'Access to private/local URLs is not allowed' },
          { status: 403 }
        )
      }
      console.error('Fetch error in fetch-url', { url, ip: request.ip, error: msg });
      throw err
=======
        console.warn(`[SSRF Filter Blocked] User: ${session.user.id} URL: ${url}`)
        return NextResponse.json({ error: 'Access to private/local URLs is not allowed' }, { status: 403 })
      }
      return handleError(err, 'nodeFetch')
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
    }
    if (!response.ok) {
<<<<<<< HEAD
      console.error('Fetch failed in fetch-url', { url, status: response.status, statusText: response.statusText, ip: request.ip });
=======
      console.error(`[Fetch Failed] User: ${session.user.id} Status: ${response.status} ${response.statusText}`)
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      )
    }
    const html = await response.text()
    const textContent = html
      .replace(/<script\\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return NextResponse.json({ url, content: textContent, length: textContent.length })
  } catch (error: unknown) {
<<<<<<< HEAD
    const msg = error instanceof Error ? error.message : 'Failed to fetch URL'
    console.error('URL fetch error:', error)
    console.warn('Malformed or suspicious fetch-url request', { error, ip: request.ip });
    return NextResponse.json({ error: msg }, { status: 500 })
=======
    return handleError(error, 'POST /api/fetch-url')
>>>>>>> ec21b88be3894000a0788718980db2767c444c06
  }
}