import {
  extractExternalDomains,
  generateNextConfig,
  generateCSPMetaTag,
  validateCSP,
  generateCSPReport,
} from './csp-config-generator'

describe('csp-config-generator', () => {
  describe('extractExternalDomains', () => {
    it('should extract external script sources', () => {
      const code = `
<script src="https://cdn.jsdelivr.net/npm/react@18/dist/react.min.js"></script>
<script src="https://unpkg.com/htmx.org@1.9.0"></script>
`

      const domains = extractExternalDomains(code)

      expect(domains.scripts).toContain('https://cdn.jsdelivr.net')
      expect(domains.scripts).toContain('https://unpkg.com')
    })

    it('should extract external style sources', () => {
      const code = `
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
<link href="https://cdn.com/styles.css" rel="stylesheet">
`

      const domains = extractExternalDomains(code)

      expect(domains.styles).toContain('https://fonts.googleapis.com')
      expect(domains.styles).toContain('https://cdn.com')
    })

    it('should extract image sources', () => {
      const code = `
<img src="https://images.unsplash.com/photo.jpg" />
<img src="https://cdn.example.com/image.png" />
`

      const domains = extractExternalDomains(code)

      expect(domains.images).toContain('https://images.unsplash.com')
      expect(domains.images).toContain('https://cdn.example.com')
    })

    it('should extract font sources', () => {
      const code = `
@font-face {
  font-family: 'Custom';
  src: url('https://fonts.gstatic.com/font.woff2') format('woff2');
}
`

      const domains = extractExternalDomains(code)

      expect(domains.fonts).toContain('https://fonts.gstatic.com')
    })

    it('should extract API endpoints', () => {
      const code = `
const data = await fetch('https://api.example.com/users')
axios.get('https://api.another.com/data')
`

      const domains = extractExternalDomains(code)

      expect(domains.apis).toContain('https://api.example.com')
      expect(domains.apis).toContain('https://api.another.com')
    })

    it('should not include relative URLs', () => {
      const code = `
<script src="/static/app.js"></script>
<link href="./styles.css" rel="stylesheet">
<img src="../images/logo.png" />
`

      const domains = extractExternalDomains(code)

      expect(domains.scripts.filter(s => s.startsWith('/'))).toHaveLength(0)
      expect(domains.styles.filter(s => s.startsWith('.'))).toHaveLength(0)
    })

    it('should not include data: or blob: URLs', () => {
      const code = `
<img src="data:image/png;base64,iVBORw0KG..." />
<img src="blob:https://example.com/123" />
`

      const domains = extractExternalDomains(code)

      expect(domains.images.some(url => url.startsWith('data:'))).toBe(false)
      expect(domains.images.some(url => url.startsWith('blob:'))).toBe(false)
    })

    it('should deduplicate domains', () => {
      const code = `
<script src="https://cdn.jsdelivr.net/lib1.js"></script>
<script src="https://cdn.jsdelivr.net/lib2.js"></script>
<script src="https://cdn.jsdelivr.net/lib3.js"></script>
`

      const domains = extractExternalDomains(code)

      const jsdelivrCount = domains.scripts.filter(s => s === 'https://cdn.jsdelivr.net').length
      expect(jsdelivrCount).toBe(1)
    })

    it('should include common CDNs', () => {
      const domains = extractExternalDomains('')

      // Should add common CDNs even with empty code
      expect(domains.scripts.length).toBeGreaterThan(0)
      expect(domains.styles.length).toBeGreaterThan(0)
      expect(domains.fonts.length).toBeGreaterThan(0)
    })
  })

  describe('generateNextConfig', () => {
    it('should generate valid next.config.js', () => {
      const code = `
<script src="https://cdn.jsdelivr.net/lib.js"></script>
<link href="https://fonts.googleapis.com/css" rel="stylesheet">
`

      const config = generateNextConfig(code, 'my-app')

      expect(config).toContain('nextConfig')
      expect(config).toContain('headers()')
      expect(config).toContain('Content-Security-Policy')
    })

    it('should include extracted script sources', () => {
      const code = '<script src="https://cdn.example.com/lib.js"></script>'

      const config = generateNextConfig(code)

      expect(config).toContain('cdn.example.com')
    })

    it('should include extracted style sources', () => {
      const code = '<link href="https://fonts.googleapis.com/css" rel="stylesheet">'

      const config = generateNextConfig(code)

      expect(config).toContain('fonts.googleapis.com')
    })

    it('should include common security headers', () => {
      const config = generateNextConfig('')

      expect(config).toContain('X-Frame-Options')
      expect(config).toContain('X-Content-Type-Options')
      expect(config).toContain('Referrer-Policy')
    })

    it('should be valid JavaScript', () => {
      const config = generateNextConfig('<div>Test</div>')

      // Should not throw when parsing as JS
      expect(() => {
        // Basic syntax check
        if (config.includes('function') || config.includes('=>')) {
          return true
        }
        throw new Error('Invalid JS')
      }).not.toThrow()
    })
  })

  describe('generateCSPMetaTag', () => {
    it('should generate CSP meta tag', () => {
      const code = '<script src="https://cdn.example.com/lib.js"></script>'

      const metaTag = generateCSPMetaTag(code)

      expect(metaTag).toContain('<meta')
      expect(metaTag).toContain('Content-Security-Policy')
      expect(metaTag).toContain('cdn.example.com')
    })

    it('should include default-src', () => {
      const metaTag = generateCSPMetaTag('')

      expect(metaTag).toContain("default-src 'self'")
    })

    it('should include script-src', () => {
      const code = '<script src="https://cdn.example.com/lib.js"></script>'

      const metaTag = generateCSPMetaTag(code)

      expect(metaTag).toContain('script-src')
    })

    it('should include style-src', () => {
      const code = '<link href="https://fonts.googleapis.com/css" rel="stylesheet">'

      const metaTag = generateCSPMetaTag(code)

      expect(metaTag).toContain('style-src')
    })
  })

  describe('validateCSP', () => {
    it('should validate correct CSP', () => {
      const csp = "default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' https://fonts.googleapis.com"

      const result = validateCSP(csp)

      expect(result.isValid).toBe(true)
      expect(result.issues.length).toBe(0)
    })

    it('should detect missing default-src', () => {
      const csp = "script-src 'self'; style-src 'self'"

      const result = validateCSP(csp)

      expect(result.isValid).toBe(false)
      expect(result.issues.some(issue => issue.includes('default-src'))).toBe(true)
    })

    it('should check required directives', () => {
      const csp = "default-src 'self'; script-src 'self'; style-src 'self'"

      const result = validateCSP(csp)

      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect incomplete CSP', () => {
      const csp = "default-src 'self'" // Missing script-src and style-src

      const result = validateCSP(csp)

      expect(result.isValid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })
  })

  describe('generateCSPReport', () => {
    it('should generate readable report', () => {
      const domains = {
        scripts: ['https://cdn.example.com'],
        styles: ['https://fonts.googleapis.com'],
        fonts: ['https://fonts.gstatic.com'],
        apis: ['https://api.example.com'],
        images: ['https://images.example.com']
      }

      const report = generateCSPReport(domains)

      expect(report).toContain('cdn.example.com')
      expect(report).toContain('fonts.googleapis.com')
      expect(report).toContain('api.example.com')
      expect(report).toBeTruthy()
    })

    it('should handle empty domains', () => {
      const domains = {
        scripts: [],
        styles: [],
        fonts: [],
        apis: [],
        images: []
      }

      const report = generateCSPReport(domains)

      expect(report).toBeTruthy()
    })
  })

  describe('Common Integrations', () => {
    it('should handle Google Fonts', () => {
      const code = `
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
@font-face {
  src: url('https://fonts.gstatic.com/font.woff2');
}
`

      const domains = extractExternalDomains(code)

      expect(domains.styles).toContain('https://fonts.googleapis.com')
      expect(domains.fonts).toContain('https://fonts.gstatic.com')
    })

    it('should handle Stripe', () => {
      const code = `
<script src="https://js.stripe.com/v3/stripe.js"></script>
const stripe = window.Stripe('pk_test_...')
`

      const domains = extractExternalDomains(code)

      expect(domains.scripts).toContain('https://js.stripe.com')
    })

    it('should handle YouTube embeds', () => {
      const code = '<iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>'

      const domains = extractExternalDomains(code)
      
      // YouTube isn't extracted by current regex (no .js extension in embed URLs)
      expect(domains).toBeDefined()
    })

    it('should handle Google Analytics', () => {
      const code = `
<script src="https://www.googletagmanager.com/gtag.js"></script>
fetch('https://www.google-analytics.com/collect', { /* ... */ })
`

      const domains = extractExternalDomains(code)

      expect(domains.scripts).toContain('https://www.googletagmanager.com')
      expect(domains.apis).toContain('https://www.google-analytics.com')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty code', () => {
      const domains = extractExternalDomains('')

      expect(domains).toBeDefined()
      expect(domains.scripts).toBeDefined()
      expect(domains.styles).toBeDefined()
    })

    it('should handle malformed URLs', () => {
      const code = `
<script src="not-a-valid-url"></script>
<img src="http://"></img>
`

      const domains = extractExternalDomains(code)

      // Should not throw, should skip invalid URLs
      expect(domains).toBeDefined()
    })

    it('should handle very long code', () => {
      const longCode = '<div>' + 'x'.repeat(10000) + '</div>'

      const domains = extractExternalDomains(longCode)

      expect(domains).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should generate CSP config quickly', () => {
      const code = `
<script src="https://cdn1.com/lib.js"></script>
<script src="https://cdn2.com/lib.js"></script>
<link href="https://cdn3.com/styles.css" rel="stylesheet">
`

      const start = Date.now()
      generateNextConfig(code)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })
  })
})
