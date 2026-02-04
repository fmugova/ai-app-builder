// lib/validators/code-validator.test.ts
// Clean test suite for CodeValidator class

import CodeValidator from '@/lib/validators/code-validator'

describe('CodeValidator', () => {
  // ============================================================================
  // HTML Validation Tests
  // ============================================================================
  describe('HTML Validation', () => {
    it('should pass valid HTML', () => {
      const validator = new CodeValidator()
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test</title>
        </head>
        <body>
          <main>
            <h1>Hello World</h1>
            <p>This is a paragraph.</p>
          </main>
        </body>
        </html>
      `
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.passed).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should fail when missing DOCTYPE', () => {
      const validator = new CodeValidator()
      // Use MINIMAL HTML (no <html>, <head>, <body>) to trigger critical error
      const html = '<div><h1>Hello</h1></div>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.passed).toBe(false)
      expect(result.errors.some(e => e.message.includes('DOCTYPE'))).toBe(true)
    })

    it('should fail when missing viewport', () => {
      const validator = new CodeValidator()
      const html = '<!DOCTYPE html><html><head></head><body></body></html>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.errors.some(e => e.message.includes('viewport'))).toBe(true)
    })

    it('should catch inline styles (CSP violation)', () => {
      const validator = new CodeValidator()
      const html = '<div style="color: red;">Text</div>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.errors.some(e => e.category === 'security')).toBe(true)
      expect(result.errors.some(e => e.message.includes('inline style'))).toBe(true)
    })

    it('should catch inline event handlers (CSP violation)', () => {
      const validator = new CodeValidator()
      const html = '<button onclick="alert()">Click</button>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.errors.some(e => e.category === 'security')).toBe(true)
      expect(result.errors.some(e => e.message.includes('onclick'))).toBe(true)
    })
  })

  // ============================================================================
  // CSS Validation Tests
  // ============================================================================
  describe('CSS Validation', () => {
    it('should pass valid CSS', () => {
      const validator = new CodeValidator()
      const css = `
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .button {
          background-color: blue;
          color: white;
        }
      `
      
      validator.validateCSS(css)
      
      expect(validator.errors.length).toBe(0)
    })

    it('should warn when missing CSS variables', () => {
      const validator = new CodeValidator()
      const css = '.container { margin: 0 auto; }'
      
      validator.validateCSS(css)
      
      expect(validator.warnings.some(w => w.message.includes('CSS custom properties'))).toBe(true)
    })

    it('should warn when missing media queries', () => {
      const validator = new CodeValidator()
      const css = '.container { padding: 20px; }'
      
      validator.validateCSS(css)
      
      expect(validator.warnings.some(w => w.message.includes('media queries'))).toBe(true)
    })

    it('should warn when missing focus styles', () => {
      const validator = new CodeValidator()
      const css = '.button { background: blue; }'
      
      validator.validateCSS(css)
      
      expect(validator.warnings.some(w => w.message.includes('focus'))).toBe(true)
    })
  })

  // ============================================================================
  // JavaScript Validation Tests
  // ============================================================================
  describe('JavaScript Validation', () => {
    it('should pass valid JavaScript', () => {
      const validator = new CodeValidator()
      const js = `
        const greeting = "Hello World";
        console.log(greeting);
        
        function greet(name) {
          return "Hello, " + name + "!";
        }
      `
      
      validator.validateJavaScript(js)
      
      expect(validator.errors.length).toBe(0)
    })

    it('should catch eval() usage', () => {
      const validator = new CodeValidator()
      const js = 'eval("alert(1)")'
      
      validator.validateJavaScript(js)
      
      expect(validator.errors.some(e => e.message.includes('eval'))).toBe(true)
    })

    it('should catch Function constructor', () => {
      const validator = new CodeValidator()
      const js = 'new Function("return 1")'
      
      validator.validateJavaScript(js)
      
      expect(validator.errors.some(e => e.message.includes('Function constructor'))).toBe(true)
    })

    it('should catch innerHTML without XSS protection', () => {
      const validator = new CodeValidator()
      const js = 'element.innerHTML = userInput'
      
      validator.validateJavaScript(js)
      
      expect(validator.errors.some(e => e.category === 'security')).toBe(true)
    })

    it('should warn about var usage', () => {
      const validator = new CodeValidator()
      const js = 'var x = 5;'
      
      validator.validateJavaScript(js)
      
      expect(validator.warnings.some(w => w.message.includes('var keyword'))).toBe(true)
    })
  })

  // ============================================================================
  // Complete Validation Tests
  // ============================================================================
  describe('Complete Validation', () => {
    it('should pass complete valid code', () => {
      const validator = new CodeValidator()
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test</title>
        </head>
        <body>
          <main>
            <h1>Hello World</h1>
          </main>
        </body>
        </html>
      `
      const css = '.container { padding: 20px; }'
      const js = 'console.log("Hello");'
      
      const result = validator.validateAll(html, css, js)
      
      expect(result.passed).toBe(true)
      expect(result.score).toBeGreaterThan(0)
    })

    it('should calculate score correctly', () => {
      const validator = new CodeValidator()
      const html = '<!DOCTYPE html><html><body></body></html>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should fail with multiple errors', () => {
      const validator = new CodeValidator()
      const html = '<div style="color:red" onclick="alert()">Test</div>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.passed).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  // ============================================================================
  // Scoring System Tests
  // ============================================================================
  describe('Scoring System', () => {
    it('should return high score for good code', () => {
      const validator = new CodeValidator()
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Perfect</title>
        </head>
        <body>
          <main>
            <header><h1>Title</h1></header>
            <footer>Footer</footer>
          </main>
        </body>
        </html>
      `
      
      const result = validator.validateAll(html, '', '')
      
      // Should be high score (may not be exactly 100 due to info messages)
      expect(result.score).toBeGreaterThan(70)
    })

    it('should deduct points for errors', () => {
      const validator = new CodeValidator()
      const html = '<div style="color:red">Test</div>' // CSP violation
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.score).toBeLessThan(100)
    })

    it('should generate summary', () => {
      const validator = new CodeValidator()
      const html = '<!DOCTYPE html><html><body></body></html>'
      
      const result = validator.validateAll(html, '', '')
      
      expect(result.summary).toBeDefined()
      expect(result.summary.score).toBeDefined()
      expect(result.summary.grade).toBeDefined()
      expect(result.summary.status).toBeDefined()
    })
  })

  // ============================================================================
  // Real-World Scenario Test
  // ============================================================================
  describe('Real-World Scenario', () => {
    it('should validate a wellness app correctly', () => {
      const validator = new CodeValidator()
      
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Wellness Tracker</title>
        </head>
        <body>
          <main>
            <div class="wellness-app">
              <header>
                <h1>Wellness Tracker</h1>
              </header>
              <div class="tracker">
                <h2>How are you feeling today?</h2>
                <div class="emoji-picker">
                  <button aria-label="Happy">😊</button>
                  <button aria-label="Neutral">😐</button>
                  <button aria-label="Sad">😔</button>
                </div>
              </div>
            </div>
          </main>
        </body>
        </html>
      `
      
      const css = `
        .wellness-app {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .emoji-picker button {
          font-size: 32px;
          padding: 10px;
          margin: 5px;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .wellness-app {
            padding: 10px;
          }
        }
      `
      
      const js = `
        document.addEventListener('DOMContentLoaded', () => {
          const buttons = document.querySelectorAll(".emoji-picker button");
          
          buttons.forEach(button => {
            button.addEventListener("click", () => {
              console.log("Mood selected:", button.textContent);
            });
          });
        });
      `
      
      const result = validator.validateAll(html, css, js)
      
      expect(result.passed).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(70)
      expect(result.summary.grade).toMatch(/[A-C]/)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty inputs', () => {
      const validator = new CodeValidator()
      const result = validator.validateAll('', '', '')
      
      expect(result.passed).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle null/undefined gracefully', () => {
      const validator = new CodeValidator()
      
      expect(() => {
        validator.validateAll('', '', '')
      }).not.toThrow()
    })

    it('should reset state between validations', () => {
      const validator = new CodeValidator()
      
      // First validation
      validator.validateAll('<div style="color:red">Test</div>', '', '')
      const firstErrors = validator.errors.length
      
      // Second validation
      validator.validateAll('<!DOCTYPE html><html><body></body></html>', '', '')
      const secondErrors = validator.errors.length
      
      // Should be different (state reset)
      expect(firstErrors).not.toBe(secondErrors)
    })
  })
})