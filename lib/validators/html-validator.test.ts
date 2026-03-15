import { validateHTMLStructure, validateHTMLQuick } from './html-validator'

const VALID_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Page</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>Some content here.</p>
</body>
</html>`

const PARTIAL_HTML = `<div class="container">
  <h1>Partial</h1>
  <p>Just a fragment</p>
</div>`

describe('validateHTMLStructure', () => {
  // ── Valid full HTML ───────────────────────────────────────────────────────────
  describe('valid full HTML', () => {
    it('returns isValid true for well-formed HTML', () => {
      const result = validateHTMLStructure(VALID_HTML)
      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('returns isTruncated false for complete HTML', () => {
      expect(validateHTMLStructure(VALID_HTML).isTruncated).toBe(false)
    })
  })

  // ── Missing structural elements ───────────────────────────────────────────────
  describe('missing structural elements', () => {
    it('flags missing DOCTYPE', () => {
      const html = '<html><body><p>No doctype</p></body></html>'
      const result = validateHTMLStructure(html)
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Missing DOCTYPE declaration')
    })

    it('flags missing closing </html> tag', () => {
      const html = '<!DOCTYPE html><html><body><p>No closing</p></body>'
      const result = validateHTMLStructure(html)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i => i.includes('Incomplete HTML'))).toBe(true)
    })
  })

  // ── Truncation detection ──────────────────────────────────────────────────────
  describe('truncation detection', () => {
    it('detects code ending with "..."', () => {
      const html = VALID_HTML + '...'
      const result = validateHTMLStructure(html)
      expect(result.isTruncated).toBe(true)
    })

    it('detects unclosed CSS comment', () => {
      const html = VALID_HTML.replace('</html>', '') + '\n<style>/* unclosed comment'
      const result = validateHTMLStructure(html)
      expect(result.isTruncated).toBe(true)
    })

    it('detects unclosed HTML comment', () => {
      const html = VALID_HTML.replace('</html>', '') + '\n<!-- not closed'
      const result = validateHTMLStructure(html)
      expect(result.isTruncated).toBe(true)
    })
  })

  // ── allowPartial mode ────────────────────────────────────────────────────────
  describe('allowPartial mode', () => {
    it('returns isValid true for partial HTML when allowPartial = true', () => {
      const result = validateHTMLStructure(PARTIAL_HTML, true)
      expect(result.isValid).toBe(true)
    })

    it('does not flag missing DOCTYPE when allowPartial = true', () => {
      const result = validateHTMLStructure(PARTIAL_HTML, true)
      expect(result.issues.some(i => i.includes('DOCTYPE'))).toBe(false)
    })

    it('still detects truncation signals even in partial mode', () => {
      const truncated = PARTIAL_HTML + '...'
      const result = validateHTMLStructure(truncated, true)
      expect(result.isTruncated).toBe(true)
    })
  })

  // ── Tag mismatch ──────────────────────────────────────────────────────────────
  describe('mismatched tags', () => {
    it('flags a large tag imbalance (> 5 difference)', () => {
      // Add many unclosed tags to the valid HTML
      const unbalanced =
        '<!DOCTYPE html><html><body>' +
        '<div><div><div><div><div><div><div><div><div><div>' +
        '</body></html>'
      const result = validateHTMLStructure(unbalanced)
      expect(result.issues.some(i => i.includes('Mismatched tags'))).toBe(true)
    })

    it('does not flag small imbalances (≤ 5)', () => {
      // Self-closing tags like <meta>, <link> count as opening; add a few
      const result = validateHTMLStructure(VALID_HTML)
      expect(result.isValid).toBe(true)
    })
  })

  // ── Return shape ──────────────────────────────────────────────────────────────
  describe('return value shape', () => {
    it('always returns isValid, issues, and isTruncated', () => {
      const result = validateHTMLStructure('')
      expect(typeof result.isValid).toBe('boolean')
      expect(Array.isArray(result.issues)).toBe(true)
      expect(typeof result.isTruncated).toBe('boolean')
    })
  })
})

describe('validateHTMLQuick', () => {
  it('returns true for complete HTML', () => {
    expect(validateHTMLQuick(VALID_HTML)).toBe(true)
  })

  it('returns false when <!DOCTYPE html> is missing', () => {
    const html = '<html><body><p>No doctype</p></body></html>'
    expect(validateHTMLQuick(html)).toBe(false)
  })

  it('returns false when </html> closing tag is missing', () => {
    const html = '<!DOCTYPE html><html><body><p>No close</p></body>'
    expect(validateHTMLQuick(html)).toBe(false)
  })

  it('returns false when <body tag is missing', () => {
    const html = '<!DOCTYPE html><html><head></head></html>'
    expect(validateHTMLQuick(html)).toBe(false)
  })

  it('returns false when </body> is missing', () => {
    const html = '<!DOCTYPE html><html><body><p>No close</p></html>'
    expect(validateHTMLQuick(html)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(validateHTMLQuick('')).toBe(false)
  })
})
