import {
  parseGeneratedHTML,
  validateHTML,
  autoFixHTML,
  extractCSS,
  extractJavaScript,
  formatValidationErrors,
} from './html-parser'

describe('html-parser', () => {
  describe('parseGeneratedHTML', () => {
    it('should parse valid HTML', () => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`

      const result = parseGeneratedHTML(html)

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html')
      expect(result).toContain('</html>')
    })

    it('should extract HTML from markdown fences', () => {
       const response = `\`\`\`html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello</h1></body>
</html>
\`\`\``

      const result = parseGeneratedHTML(response)

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).not.toContain('```')
    })

    it('should wrap body-only content', () => {
      const bodyContent = '<body><h1>Hello</h1></body>'

      const result = parseGeneratedHTML(bodyContent)

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html')
      expect(result).toContain('<head')
      expect(result).toContain(bodyContent)
    })

    it('should auto-fix invalid HTML', () => {
      const invalidHTML = '<html><body><h1>Hello</body></html>'

      const result = parseGeneratedHTML(invalidHTML)

      // Should add missing DOCTYPE and other required elements
      expect(result).toContain('<!DOCTYPE html>')
    })

    it('should handle plain content', () => {
      const plainContent = 'Just some text'

      const result = parseGeneratedHTML(plainContent)

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('Just some text')
    })
  })

  describe('validateHTML', () => {
    it('should validate complete HTML structure', () => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`

      const result = validateHTML(html)

      expect(result.isValid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should detect missing DOCTYPE', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'

      const result = validateHTML(html)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_tag',
          message: expect.stringContaining('DOCTYPE')
        })
      )
    })

    it('should detect missing html tag', () => {
      const html = '<!DOCTYPE html><head><title>Test</title></head><body></body>'

      const result = validateHTML(html)

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_tag',
          message: expect.stringContaining('html')
        })
      )
    })

    it('should detect missing head tag', () => {
      const html = '<!DOCTYPE html><html><body></body></html>'

      const result = validateHTML(html)

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_tag',
          message: expect.stringContaining('head')
        })
      )
    })

    it('should detect missing body tag', () => {
      const html = '<!DOCTYPE html><html><head><title>Test</title></head></html>'

      const result = validateHTML(html)

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_tag',
          message: expect.stringContaining('body')
        })
      )
    })

    it('should warn about missing charAt', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body></body>
</html>`

      const result = validateHTML(html)

      expect(result.warnings.some(w => w.includes('charset'))).toBe(true)
    })

    it('should warn about missing viewport', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test</title>
</head>
<body></body>
</html>`

      const result = validateHTML(html)

      expect(result.warnings.some(w => w.includes('viewport'))).toBe(true)
    })

    it('should pass validation for perfect HTML', () => {
      const perfectHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`

      const result = validateHTML(perfectHTML)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('autoFixHTML', () => {
    it('should add missing DOCTYPE', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const errors = [{ type: 'missing_tag' as const, message: 'Missing DOCTYPE declaration', fix: 'Add <!DOCTYPE html>' }]

      const fixed = autoFixHTML(html, errors)

      expect(fixed).toContain('<!DOCTYPE html>')
    })

    it('should add missing html tags', () => {
      const html = '<!DOCTYPE html><head><title>Test</title></head><body></body>'
      const errors = [{ type: 'missing_tag' as const, message: 'Missing <html> tag', fix: 'Add <html> tag' }]

      const fixed = autoFixHTML(html, errors)

      expect(fixed).toContain('<html')
      expect(fixed).toContain('</html>')
    })

    it('should add missing head tag', () => {
      const html = '<!DOCTYPE html><html><body></body></html>'
      const errors = [{ type: 'missing_tag' as const, message: 'Missing <head> tag', fix: 'Add <head> tag' }]

      const fixed = autoFixHTML(html, errors)

      expect(fixed).toContain('<head>')
      expect(fixed).toContain('</head>')
    })

    it('should add missing body tag', () => {
      const html = '<!DOCTYPE html><html><head><title>Test</title></head></html>'
      const errors = [{ type: 'missing_tag' as const, message: 'Missing <body> tag', fix: 'Add <body> tag' }]

      const fixed = autoFixHTML(html, errors)

      expect(fixed).toContain('<body>')
      expect(fixed).toContain('</body>')
    })

    it('should preserve existing content', () => {
      const html = '<html><head><title>My Title</title></head><body><h1>Content</h1></body></html>'
      const errors = [{ type: 'missing_tag' as const, message: 'Missing DOCTYPE declaration', fix: 'Add <!DOCTYPE html>' }]

      const fixed = autoFixHTML(html, errors)

      expect(fixed).toContain('My Title')
      expect(fixed).toContain('Content')
    })
  })

  describe('extractCSS', () => {
    it('should extract inline style tags', () => {
      const html = `<html>
<head>
  <style>
    body { margin: 0; }
    .container { max-width: 1200px; }
  </style>
</head>
<body></body>
</html>`

      const css = extractCSS(html)

      expect(css).toContain('body { margin: 0; }')
      expect(css).toContain('container')
    })

    it('should extract multiple style tags', () => {
      const html = `<html>
<style>.class1 { color: red; }</style>
<style>.class2 { color: blue; }</style>
</html>`

      const css = extractCSS(html)

      expect(css).toContain('class1')
      expect(css).toContain('class2')
    })

    it('should handle HTML with no styles', () => {
      const html = '<html><body>No styles</body></html>'

      const css = extractCSS(html)

      expect(css).toBe('')
    })
  })

  describe('extractJavaScript', () => {
    it('should extract inline script tags', () => {
      const html = `<html>
<script>
  console.log('Hello')
  function test() { return true; }
</script>
</html>`

      const js = extractJavaScript(html)

      expect(js).toContain("console.log('Hello')")
      expect(js).toContain('function test()')
    })

    it('should extract multiple script tags', () => {
      const html = `<html>
<script>const a = 1;</script>
<script>const b = 2;</script>
</html>`

      const js = extractJavaScript(html)

      expect(js).toContain('const a = 1')
      expect(js).toContain('const b = 2')
    })

    it('should handle HTML with no scripts', () => {
      const html = '<html><body>No scripts</body></html>'

      const js = extractJavaScript(html)

      expect(js).toBe('')
    })
  })

  describe('formatValidationErrors', () => {
    it('should format validation results', () => {
      const result = {
        isValid: false,
        errors: [
          { type: 'missing_tag' as const, message: 'Missing DOCTYPE', fix: 'Add DOCTYPE' }
        ],
        warnings: ['Missing viewport'],
        score: 60
      }

      const formatted = formatValidationErrors(result)

      expect(formatted).toContain('Missing DOCTYPE')
      expect(formatted).toContain('Missing viewport')
      expect(formatted).toBeTruthy()
    })

    it('should handle valid HTML', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100
      }

      const formatted = formatValidationErrors(result)

      expect(formatted).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty HTML', () => {
      const result = validateHTML('')

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle HTML comments', () => {
      const html = `<!DOCTYPE html>
<html>
<!-- This is a comment -->
<head><title>Test</title></head>
<body><!-- Another comment --></body>
</html>`

      const result = validateHTML(html)

      expect(result).toBeTruthy()
    })

    it('should handle self-closing tags', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <img src="image.jpg" alt="Test" />
</body>
</html>`

      const result = validateHTML(html)

      expect(result).toBeTruthy()
    })
  })
})
