// lib/validators/code-validator.ts
// Enterprise-grade code validation with strict rules

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info'
  category: 'syntax' | 'security' | 'performance' | 'accessibility' | 'seo' | 'best-practices'
  message: string
  line?: number
  column?: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  fix?: string // Suggested fix for the issue
}

export interface ValidationResult {
  passed: boolean
  score: number
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
  info: ValidationMessage[]
  summary: {
    total: number
    errors: number
    warnings: number
    info: number
    score: number
    grade: string
    status: string
  }
}

class CodeValidator {
  public errors: ValidationMessage[] = []
  public warnings: ValidationMessage[] = []
  public info: ValidationMessage[] = []
  private hasCriticalError: boolean = false

  constructor() {
    this.reset()
  }

  private reset(): void {
    this.errors = []
    this.warnings = []
    this.info = []
    this.hasCriticalError = false
  }

  private addError(category: ValidationMessage['category'], message: string, severity: ValidationMessage['severity'] = 'high', fix?: string): void {
    this.errors.push({ type: 'error', category, message, severity, fix })
    if (severity === 'critical') {
      this.hasCriticalError = true
    }
  }

  private addWarning(category: ValidationMessage['category'], message: string, severity: ValidationMessage['severity'] = 'medium', fix?: string): void {
    this.warnings.push({ type: 'warning', category, message, severity, fix })
  }

  private addInfo(category: ValidationMessage['category'], message: string, severity: ValidationMessage['severity'] = 'low', fix?: string): void {
    this.info.push({ type: 'info', category, message, severity, fix })
  }

  // ==========================================================================
  // HTML VALIDATION
  // ==========================================================================
  public validateHTML(html: string): void {
    if (!html || html.trim().length === 0) {
      this.addError('syntax', 'HTML content is empty', 'critical')
      return
    }

    // Check for DOCTYPE - CRITICAL on minimal/incomplete HTML
    if (!html.includes('<!DOCTYPE html>')) {
      // If HTML is minimal (no proper structure), make it CRITICAL (auto-fail)
      if (!html.includes('<html') || !html.includes('<head') || !html.includes('<body')) {
        this.addError('syntax', 'Missing DOCTYPE declaration - required for minimal HTML', 'critical', 'Add <!DOCTYPE html> at the beginning of the file')
      } else {
        // Full document but missing DOCTYPE - still an error but not critical
        this.addError('syntax', 'Missing DOCTYPE declaration', 'high', 'Add <!DOCTYPE html> at the beginning of the file')
      }
    }

    // Check for viewport meta tag
    if (!html.includes('viewport')) {
      this.addError('accessibility', 'Missing viewport meta tag for mobile responsiveness', 'high', 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> in <head>')
    }

    // Check for charset
    if (!html.includes('charset')) {
      this.addWarning('syntax', 'Missing charset declaration', 'medium', 'Add <meta charset="UTF-8"> in <head>')
    }

    // Check for lang attribute on html tag
    if (!html.match(/<html[^>]*lang=/)) {
      this.addWarning('accessibility', 'Missing lang attribute on <html> tag', 'medium', 'Add lang="en" to <html> tag')
    }

    // Check for meta description (SEO)
    if (!html.includes('name="description"')) {
      this.addWarning('seo', 'Missing meta description for SEO', 'medium', 'Add <meta name="description" content="Your page description"> in <head>')
    }

    // Check for CSS custom properties usage
    if (!html.includes(':root') && !html.includes('--')) {
      this.addInfo('best-practices', 'Consider using CSS custom properties (variables) for maintainability', 'low', 'Define CSS variables in :root for colors, spacing, etc.')
    }

    // CSP Violations - inline styles
    if (html.match(/style\s*=\s*["']/)) {
      this.addError('security', 'CSP violation: Found inline style attributes', 'critical')
    }

    // CSP Violations - inline event handlers
    const inlineHandlers = ['onclick', 'onload', 'onerror', 'onmouseover']
    inlineHandlers.forEach(handler => {
      if (html.includes(handler + '=')) {
        this.addError('security', `CSP violation: Found inline ${handler} handler`, 'critical')
      }
    })

    // Check for semantic HTML
    if (!html.includes('<main')) {
      this.addInfo('accessibility', 'Consider using <main> for main content', 'low')
    }

    // Check for h1
    if (!html.match(/<h1[^>]*>/)) {
      this.addError('accessibility', 'Missing h1 heading for page title', 'high', 'Add <h1>Page Title</h1> as the main heading')
    }

    // Check for multiple h1
    const h1Count = (html.match(/<h1[^>]*>/g) || []).length
    if (h1Count > 1) {
      this.addWarning('accessibility', `Multiple h1 elements found (${h1Count}). Should have only one`, 'medium', 'Use only one <h1> tag for the main page title')
    }

    // Check for alt attributes on images
    const imgTags = html.match(/<img[^>]*>/g) || []
    const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt='))
    if (imgsWithoutAlt.length > 0) {
      this.addError('accessibility', `${imgsWithoutAlt.length} image(s) missing alt attribute`, 'high', 'Add descriptive alt text to all images for accessibility')
    }

    // Security: Check for innerHTML usage with dynamic content
    const scriptContent = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)?.join(' ') || '';
    const dangerousInnerHTML = [
      { pattern: /\.innerHTML\s*=\s*[^'"]*\$\{/, message: 'innerHTML with template literal (XSS risk)' },
      { pattern: /\.innerHTML\s*=\s*.*\+/, message: 'innerHTML with concatenation (XSS risk)' },
      { pattern: /\.innerHTML\s*\+=/, message: 'innerHTML append operation (XSS risk)' },
    ];

    dangerousInnerHTML.forEach(({ pattern, message }) => {
      if (pattern.test(scriptContent)) {
        this.addWarning('security', message + '. Use textContent instead.', 'high');
      }
    });

    // Security: Check for hardcoded API keys
    const apiKeyPatterns = [
      /['"](sk|pk)[-_][a-zA-Z0-9]{20,}['"]/, // Stripe-like keys
      /['"]eyJ[a-zA-Z0-9]{30,}['"]/, // JWT-like tokens
      /SUPABASE.*KEY.*=.*['"][^'"]{40,}['"]/, // Supabase keys
      /API.*KEY.*=.*['"][^'"]{20,}['"]/, // Generic API keys
    ];

    apiKeyPatterns.forEach(pattern => {
      if (pattern.test(scriptContent)) {
        this.addError('security', 'Possible hardcoded API key or credential detected', 'critical');
      }
    });


    // Check for lang attribute
    if (!html.match(/<html[^>]*lang=/)) {
      this.addWarning('accessibility', 'Missing lang attribute on <html> tag', 'medium', 'Add lang="en" to <html> tag for screen readers')
    }

    // Check for heading hierarchy (no skipped levels)
    const headingLevels = this.extractHeadingLevels(html)
    if (headingLevels.length > 1) {
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i - 1] > 1) {
          this.addWarning('accessibility', `Skipped heading level: h${headingLevels[i - 1]} to h${headingLevels[i]}`, 'medium', 'Follow proper heading hierarchy without skipping levels')
          break
        }
      }
    }

    // Check for title tag
    if (!html.match(/<title>.*?<\/title>/)) {
      this.addError('seo', 'Missing <title> tag', 'high', 'Add <title>Your Page Title</title> in <head>')
    }

    // Check for Open Graph tags
    if (!html.includes('property="og:')) {
      this.addInfo('seo', 'Missing Open Graph tags for social media sharing', 'low', 'Add og:title, og:description, og:image meta tags')
    }

    // Check for ARIA labels on buttons without text
    const buttonMatches = html.match(/<button[^>]*>.*?<\/button>/gs)
    if (buttonMatches) {
      buttonMatches.forEach(button => {
        const hasText = button.match(/<button[^>]*>(.*?)<\/button>/s)?.[1]?.trim()
        const hasAriaLabel = button.includes('aria-label=')
        
        if (!hasText && !hasAriaLabel) {
          this.addWarning('accessibility', 'Button without text or aria-label', 'medium', 'Add text content or aria-label to buttons')
        }
      })
    }

    // Check for generic link text
    const linkMatches = html.match(/<a[^>]*>.*?<\/a>/gs)
    if (linkMatches) {
      linkMatches.forEach(link => {
        const linkText = link.match(/<a[^>]*>(.*?)<\/a>/s)?.[1]?.trim()
        const genericTexts = ['click here', 'read more', 'here', 'more']
        
        if (linkText && genericTexts.includes(linkText.toLowerCase())) {
          this.addWarning('accessibility', `Link with generic text: "${linkText}"`, 'medium', 'Use descriptive link text instead of "click here" or "read more"')
        }

        // Check for external links without rel attributes
        if (link.includes('href="http') && !link.includes('rel=')) {
          this.addInfo('security', 'External link missing rel attribute', 'low', 'Add rel="noopener noreferrer" to external links')
        }
      })
    }

    // Check for form input accessibility
    const inputMatches = html.match(/<input[^>]*>/g)
    if (inputMatches) {
      inputMatches.forEach(input => {
        const hasId = input.includes('id=')
        const type = input.match(/type="([^"]*)"/)?.[1]
        
        if (!hasId && type !== 'submit' && type !== 'button') {
          this.addWarning('accessibility', 'Form input missing id for label association', 'medium', 'Add id to inputs and associate with <label for="...">')
        }
      })
    }

    // Check for lazy loading on images
    const imgMatches = html.match(/<img[^>]*>/g)
    if (imgMatches) {
      let imagesWithoutLoading = 0
      imgMatches.forEach(img => {
        if (!img.includes('loading=')) {
          imagesWithoutLoading++
        }
      })
      
      if (imagesWithoutLoading > 0) {
        this.addInfo('performance', `${imagesWithoutLoading} image(s) missing lazy loading`, 'low', 'Add loading="lazy" to images below the fold')
      }
    }

    // Check for large inline scripts
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs)
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        if (script.length > 5000) {
          this.addWarning('performance', 'Large inline script detected', 'medium', 'Extract large scripts to external files')
        }
      })
    }
  }

  private extractHeadingLevels(html: string): number[] {
    const headingMatches = html.match(/<h([1-6])[^>]*>/g)
    if (!headingMatches) return []
    
    return headingMatches
      .map(match => parseInt(match.match(/h([1-6])/)?.[1] || '0'))
      .filter(level => level > 0)
  }

  // ==========================================================================
  // CSS VALIDATION
  // ==========================================================================
  public validateCSS(css: string): void {
    if (!css || css.trim().length === 0) {
      this.addInfo('performance', 'No CSS provided', 'low')
      return
    }

    // Check for CSS custom properties (variables)
    if (!css.includes('--')) {
      this.addWarning('performance', 'Consider using CSS custom properties (variables) for maintainability', 'low')
    }

    // Check for media queries (responsive design)
    if (!css.includes('@media')) {
      this.addWarning('accessibility', 'No media queries found. Consider responsive design', 'medium')
    }

    // Check for focus styles
    if (!css.includes(':focus')) {
      this.addWarning('accessibility', 'Missing :focus styles for keyboard navigation', 'high')
    }

    // Check for reduced motion
    if (!css.includes('prefers-reduced-motion')) {
      this.addInfo('accessibility', 'Consider adding @media (prefers-reduced-motion) for accessibility', 'low')
    }

    // Check for unmatched braces
    const openBraces = (css.match(/{/g) || []).length
    const closeBraces = (css.match(/}/g) || []).length
    if (openBraces !== closeBraces) {
      this.addError('syntax', `Unmatched braces in CSS (${openBraces} open, ${closeBraces} close)`, 'critical')
    }
  }

  // ==========================================================================
  // JAVASCRIPT VALIDATION
  // ==========================================================================
  public validateJavaScript(js: string): void {
    if (!js || js.trim().length === 0) {
      this.addInfo('performance', 'No JavaScript provided', 'low')
      return
    }

    // Security checks
    if (js.includes('eval(')) {
      this.addError('security', 'Security risk: eval() usage detected', 'critical')
    }

    if (js.includes('Function(')) {
      this.addError('security', 'Security risk: Function constructor detected', 'critical')
    }

    if (js.includes('innerHTML') && !js.includes('textContent')) {
      this.addError('security', 'XSS risk: innerHTML usage without proper sanitization', 'high')
    }

    if (js.includes('document.write')) {
      this.addError('security', 'Security risk: document.write() can be dangerous', 'high')
    }

    // Code quality
    if (js.includes('var ')) {
      this.addWarning('syntax', 'Consider using const/let instead of var keyword', 'low')
    }

    if (js.includes('console.log') && process.env.NODE_ENV === 'production') {
      this.addWarning('performance', 'console.log statements should be removed in production', 'low')
    }

    // Check for strict mode
    if (!js.includes('"use strict"') && !js.includes("'use strict'")) {
      this.addInfo('syntax', 'Consider adding "use strict" for better error catching', 'low')
    }

    // Check for unmatched parentheses/brackets/braces
    const openParen = (js.match(/\(/g) || []).length
    const closeParen = (js.match(/\)/g) || []).length
    const openBracket = (js.match(/\[/g) || []).length
    const closeBracket = (js.match(/\]/g) || []).length
    const openBrace = (js.match(/{/g) || []).length
    const closeBrace = (js.match(/}/g) || []).length

    if (openParen !== closeParen) {
      this.addError('syntax', `Unmatched parentheses (${openParen} open, ${closeParen} close)`, 'critical')
    }
    if (openBracket !== closeBracket) {
      this.addError('syntax', `Unmatched brackets (${openBracket} open, ${closeBracket} close)`, 'critical')
    }
    if (openBrace !== closeBrace) {
      this.addError('syntax', `Unmatched braces (${openBrace} open, ${closeBrace} close)`, 'critical')
    }
  }

  // ==========================================================================
  // SECURITY VALIDATION
  // ==========================================================================
  public validateSecurity(html: string, js: string): void {
    // XSS checks
    if (js.includes('innerHTML') || js.includes('outerHTML')) {
      if (!js.includes('DOMPurify') && !js.includes('textContent')) {
        this.addError('security', 'XSS vulnerability: Using innerHTML without sanitization', 'critical')
      }
    }

    // SQL injection patterns (if any backend code)
    if (js.includes('SELECT') && js.includes('WHERE')) {
      this.addWarning('security', 'Potential SQL injection risk detected', 'high')
    }

    // Check for hardcoded credentials
    const credentialPatterns = ['password:', 'apiKey:', 'api_key:', 'secret:', 'token:']
    credentialPatterns.forEach(pattern => {
      if (js.toLowerCase().includes(pattern.toLowerCase())) {
        this.addError('security', 'Potential hardcoded credentials detected', 'critical')
      }
    })
  }

  // ==========================================================================
  // ACCESSIBILITY VALIDATION
  // ==========================================================================
  public validateAccessibility(html: string): void {
    // ARIA checks
    if (!html.includes('aria-')) {
      this.addInfo('accessibility', 'Consider adding ARIA attributes for better accessibility', 'low')
    }

    // Form labels
    const inputsWithoutLabels = html.match(/<input(?![^>]*id=).*?>/g)
    if (inputsWithoutLabels && inputsWithoutLabels.length > 0) {
      this.addWarning('accessibility', 'Form inputs should have associated labels', 'medium')
    }

    // Button text
    if (html.includes('<button></button>') || html.includes('<button />')) {
      this.addError('accessibility', 'Buttons must have text content or aria-label', 'high')
    }

    // Color contrast (basic check)
    if (html.includes('color:') && !html.includes('background')) {
      this.addInfo('accessibility', 'Ensure sufficient color contrast for readability', 'low')
    }
  }

  // ==========================================================================
  // COMPLETE VALIDATION
  // ==========================================================================
  public validateAll(html: string, css: string, js: string): ValidationResult {
    // Reset state
    this.reset()

    // Run all validations
    this.validateHTML(html)
    this.validateCSS(css)
    this.validateJavaScript(js)
    this.validateSecurity(html, js)
    this.validateAccessibility(html)

    // Calculate score (start at 100, deduct points)
    let score = 100

    this.errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          score -= 15
          break
        case 'high':
          score -= 10
          break
        case 'medium':
          score -= 5
          break
        case 'low':
          score -= 2
          break
      }
    })

    this.warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high':
          score -= 3
          break
        case 'medium':
          score -= 2
          break
        case 'low':
          score -= 1
          break
      }
    })

    // Ensure score doesn't go below 0
    score = Math.max(0, score)

    // Determine grade
    let grade = 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'

    // Determine status - automatically fail if critical error OR score < 70
    const status = (score >= 70 && !this.hasCriticalError) ? 'passed' : 'failed'
    const passed = (score >= 70 && !this.hasCriticalError)

    return {
      passed,
      score,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      summary: {
        total: this.errors.length + this.warnings.length + this.info.length,
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length,
        score,
        grade,
        status,
      },
    }
  }

  static isCodeComplete(code: string, type: 'html' | 'css' | 'js'): boolean {
    // Simple completeness checks (customize as needed)
    switch (type) {
      case 'html':
        return /<\/html>/i.test(code) || /<\/body>/i.test(code);
      case 'css':
        return code.trim().length > 0 && !code.trim().endsWith('{');
      case 'js':
        return code.trim().length > 0 && !code.trim().endsWith('{');
      default:
        return false;
    }
  }
}

// Export as default
export default CodeValidator

// Named export for convenience
export function validateCode(html: string, css: string = '', js: string = ''): ValidationResult {
  const validator = new CodeValidator()
  return validator.validateAll(html, css, js)
}