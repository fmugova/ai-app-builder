// lib/csp-config-generator.ts
// Auto-generate Content Security Policy configuration for Next.js

interface CSPDomains {
  scripts: string[]
  styles: string[]
  fonts: string[]
  apis: string[]
  images: string[]
}

/**
 * Extract external domains from generated code
 * Solves: CSP violations preventing external resources from loading
 */
export function extractExternalDomains(code: string): CSPDomains {
  const domains: CSPDomains = {
    scripts: [],
    styles: [],
    fonts: [],
    apis: [],
    images: [],
  }

  // Extract script sources
  const scriptMatches = code.matchAll(/src=["'](https?:\/\/[^"']+\.js[^"']*)/gi)
  for (const match of scriptMatches) {
    try {
      const url = new URL(match[1])
      if (!domains.scripts.includes(url.origin)) {
        domains.scripts.push(url.origin)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Extract CSS sources
  const styleMatches = code.matchAll(/(?:href|import)=["'](https?:\/\/[^"']+\.css[^"']*)/gi)
  for (const match of styleMatches) {
    try {
      const url = new URL(match[1])
      if (!domains.styles.includes(url.origin)) {
        domains.styles.push(url.origin)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Extract font sources
  const fontMatches = code.matchAll(/url\(["']?(https?:\/\/[^)"']+\.(?:woff2?|ttf|otf|eot))/gi)
  for (const match of fontMatches) {
    try {
      const url = new URL(match[1])
      if (!domains.fonts.includes(url.origin)) {
        domains.fonts.push(url.origin)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Extract API endpoints (fetch, axios, etc.)
  const fetchMatches = code.matchAll(/(?:fetch|axios\.(?:get|post|put|delete))\(["'](https?:\/\/[^"']+)/gi)
  for (const match of fetchMatches) {
    try {
      const url = new URL(match[1])
      if (!domains.apis.includes(url.origin)) {
        domains.apis.push(url.origin)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Extract image sources
  const imageMatches = code.matchAll(/(?:src|srcset)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp|svg))/gi)
  for (const match of imageMatches) {
    try {
      const url = new URL(match[1])
      if (!domains.images.includes(url.origin)) {
        domains.images.push(url.origin)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Add common CDNs
  addCommonCDNs(domains)

  return domains
}

/**
 * Add commonly used CDNs
 */
function addCommonCDNs(domains: CSPDomains): void {
  const commonScripts = [
    'https://unpkg.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
  ]

  const commonStyles = [
    'https://fonts.googleapis.com',
    'https://cdn.tailwindcss.com',
  ]

  const commonFonts = [
    'https://fonts.gstatic.com',
  ]

  for (const cdn of commonScripts) {
    if (!domains.scripts.includes(cdn)) {
      domains.scripts.push(cdn)
    }
  }

  for (const cdn of commonStyles) {
    if (!domains.styles.includes(cdn)) {
      domains.styles.push(cdn)
    }
  }

  for (const cdn of commonFonts) {
    if (!domains.fonts.includes(cdn)) {
      domains.fonts.push(cdn)
    }
  }
}

/**
 * Generate next.config.js with CSP headers
 */
export function generateNextConfig(projectCode: string, projectName?: string): string {
  const domains = extractExternalDomains(projectCode)

  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' ${domains.scripts.join(' ')}",
              "style-src 'self' 'unsafe-inline' ${domains.styles.join(' ')}",
              "img-src 'self' data: blob: https: ${domains.images.join(' ')}",
              "font-src 'self' data: ${domains.fonts.join(' ')}",
              "connect-src 'self' ${domains.apis.join(' ')}",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ]
              .filter(Boolean)
              .join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Environment variables
  env: {
    APP_NAME: '${projectName || 'My App'}',
    APP_VERSION: '1.0.0',
  },

  // Image optimization
  images: {
    domains: [${domains.images.map(d => `'${new URL(d).hostname}'`).join(', ')}],
    formats: ['image/avif', 'image/webp'],
  },

  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

module.exports = nextConfig
`
}

/**
 * Generate CSP meta tag for HTML (alternative to next.config.js)
 */
export function generateCSPMetaTag(projectCode: string): string {
  const domains = extractExternalDomains(projectCode)

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${domains.scripts.join(' ')}`,
    `style-src 'self' 'unsafe-inline' ${domains.styles.join(' ')}`,
    `img-src 'self' data: blob: https: ${domains.images.join(' ')}`,
    `font-src 'self' data: ${domains.fonts.join(' ')}`,
    `connect-src 'self' ${domains.apis.join(' ')}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ]
    .filter(Boolean)
    .join('; ')

  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`
}

/**
 * Validate CSP configuration
 */
export function validateCSP(cspString: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check for unsafe-inline in production
  if (process.env.NODE_ENV === 'production') {
    if (cspString.includes("'unsafe-inline'")) {
      issues.push("Using 'unsafe-inline' in production is not recommended")
    }
    if (cspString.includes("'unsafe-eval'")) {
      issues.push("Using 'unsafe-eval' in production is not recommended")
    }
  }

  // Check for required directives
  const requiredDirectives = ['default-src', 'script-src', 'style-src']
  for (const directive of requiredDirectives) {
    if (!cspString.includes(directive)) {
      issues.push(`Missing required CSP directive: ${directive}`)
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * Get CSP report for debugging
 */
export function generateCSPReport(domains: CSPDomains): string {
  return `
# Content Security Policy Configuration Report

## Script Sources (${domains.scripts.length})
${domains.scripts.map(d => `- ${d}`).join('\n')}

## Style Sources (${domains.styles.length})
${domains.styles.map(d => `- ${d}`).join('\n')}

## Font Sources (${domains.fonts.length})
${domains.fonts.map(d => `- ${d}`).join('\n')}

## API Sources (${domains.apis.length})
${domains.apis.map(d => `- ${d}`).join('\n')}

## Image Sources (${domains.images.length})
${domains.images.map(d => `- ${d}`).join('\n')}

## Security Recommendations
- Consider removing 'unsafe-inline' for production
- Consider removing 'unsafe-eval' for production
- Use nonces or hashes instead of 'unsafe-inline'
- Regularly audit external domains
`
}
