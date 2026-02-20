import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'
import nodeFetch from 'node-fetch'
import dns from 'dns'
import net from 'net'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ssrfFilter = require('ssrf-req-filter') as (url: string) => import('http').Agent

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const FORBIDDEN_HOSTS = ['localhost', '0.0.0.0', '127.0.0.1', '::1']

const PRIVATE_CIDRS = [
  // IPv4 private and special-use ranges
  { base: '10.0.0.0', mask: 8 },
  { base: '172.16.0.0', mask: 12 },
  { base: '192.168.0.0', mask: 16 },
  { base: '127.0.0.0', mask: 8 }, // loopback
  { base: '169.254.0.0', mask: 16 }, // link-local
  // IPv6 private and special-use ranges
  { base: '::1', mask: 128 }, // loopback
  { base: 'fc00::', mask: 7 }, // unique local
  { base: 'fe80::', mask: 10 }, // link-local
]

function ipToBigInt(ip: string): bigint | null {
  const version = net.isIP(ip)
  if (version === 4) {
    return ip.split('.').reduce((acc, octet) => (acc << 8n) + BigInt(Number(octet)), 0n)
  }
  if (version === 6) {
    // Expand IPv6 and convert to bigint
    const sections = ip.split('::')
    let hextets: string[] = []
    if (sections.length === 1) {
      hextets = sections[0].split(':')
    } else {
      const left = sections[0] ? sections[0].split(':') : []
      const right = sections[1] ? sections[1].split(':') : []
      const missing = 8 - (left.length + right.length)
      hextets = [...left, ...Array(missing).fill('0'), ...right]
    }
    return hextets.reduce((acc, h) => (acc << 16n) + BigInt(parseInt(h || '0', 16)), 0n)
  }
  return null
}

function isIpInCidr(ip: string, base: string, mask: number): boolean {
  const ipNum = ipToBigInt(ip)
  const baseNum = ipToBigInt(base)
  if (ipNum === null || baseNum === null) return false
  const maxBits = net.isIP(ip) === 4 ? 32n : 128n
  const shift = maxBits - BigInt(mask)
  return (ipNum >> shift) === (baseNum >> shift)
}

function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return false
  return PRIVATE_CIDRS.some(({ base, mask }) => isIpInCidr(ip, base, mask))
}

async function isSafePublicHost(hostname: string): Promise<boolean> {
  try {
    const results = await dns.promises.lookup(hostname, { all: true })
    if (!results || results.length === 0) return false
    for (const { address } of results) {
      if (isPrivateIp(address)) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

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
    if (!isValidUrlInput(url)) {
      console.warn(`[Invalid URL] User: ${session.user.id} URL: ${url}`)
      return NextResponse.json({ error: 'URL is required and must be valid.' }, { status: 400 })
    }
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      console.warn(`[Malformed URL] User: ${session.user.id} URL: ${url}`)
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      console.warn(`[Forbidden protocol] User: ${session.user.id} Protocol: ${parsedUrl.protocol}`)
      return NextResponse.json({ error: 'Only http:// and https:// URLs are allowed' }, { status: 400 })
    }
    const hostname = parsedUrl.hostname.toLowerCase()
    if (FORBIDDEN_HOSTS.includes(hostname)) {
      console.warn(`[Blocked hostname] User: ${session.user.id} Hostname: ${hostname}`)
      return NextResponse.json({ error: 'Access to private/local URLs is not allowed' }, { status: 403 })
    }
    const isSafeHost = await isSafePublicHost(hostname)
    if (!isSafeHost) {
      console.warn(`[Blocked IP range] User: ${session.user.id} Hostname: ${hostname}`)
      return NextResponse.json({ error: 'Access to private/local IP ranges is not allowed' }, { status: 403 })
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
        console.warn(`[SSRF Filter Blocked] User: ${session.user.id} URL: ${url}`)
        return NextResponse.json({ error: 'Access to private/local URLs is not allowed' }, { status: 403 })
      }
      return handleError(err, 'nodeFetch')
    }
    if (!response.ok) {
      console.error(`[Fetch Failed] User: ${session.user.id} Status: ${response.status} ${response.statusText}`)
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
    return handleError(error, 'POST /api/fetch-url')
  }
}