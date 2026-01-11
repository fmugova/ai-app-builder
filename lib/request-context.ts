import { NextRequest } from 'next/server'

/**
 * Request Context Utilities
 * Extract IP address and user agent from requests for security logging
 */

/**
 * Extract IP address from request headers
 * Supports various proxy configurations (Vercel, Cloudflare, etc.)
 */
export function getClientIP(req: NextRequest | Request): string | undefined {
  // Try various headers in order of preference
  const headers = req.headers
  
  // Vercel/Next.js
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim()
  }
  
  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Other proxies
  const xRealIP = headers.get('x-real-ip')
  if (xRealIP) {
    return xRealIP
  }
  
  // Fallback to x-client-ip
  const xClientIP = headers.get('x-client-ip')
  if (xClientIP) {
    return xClientIP
  }
  
  return undefined
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: NextRequest | Request): string | undefined {
  return req.headers.get('user-agent') || undefined
}

/**
 * Get comprehensive request context for security logging
 */
export function getRequestContext(req: NextRequest | Request) {
  return {
    ipAddress: getClientIP(req),
    userAgent: getUserAgent(req),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Detect if request is from a known bot/crawler
 */
export function isBot(userAgent?: string): boolean {
  if (!userAgent) return false
  
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'facebookexternalhit'
  ]
  
  const lowerUA = userAgent.toLowerCase()
  return botPatterns.some(pattern => lowerUA.includes(pattern))
}

/**
 * Parse user agent to extract device/browser info
 */
export function parseUserAgent(userAgent?: string): {
  browser?: string
  os?: string
  device?: string
} {
  if (!userAgent) return {}
  
  const result: { browser?: string; os?: string; device?: string } = {}
  
  // Detect browser
  if (userAgent.includes('Chrome')) result.browser = 'Chrome'
  else if (userAgent.includes('Firefox')) result.browser = 'Firefox'
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) result.browser = 'Safari'
  else if (userAgent.includes('Edge')) result.browser = 'Edge'
  
  // Detect OS
  if (userAgent.includes('Windows')) result.os = 'Windows'
  else if (userAgent.includes('Mac OS X')) result.os = 'macOS'
  else if (userAgent.includes('Linux')) result.os = 'Linux'
  else if (userAgent.includes('Android')) result.os = 'Android'
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) result.os = 'iOS'
  
  // Detect device type
  if (userAgent.includes('Mobile')) result.device = 'Mobile'
  else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) result.device = 'Tablet'
  else result.device = 'Desktop'
  
  return result
}
