// lib/validators/code-validator.ts
// Enterprise-grade code validation with strict rules

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info'
  category: 'syntax' | 'security' | 'performance' | 'accessibility' | 'seo'
  message: string
  line?: number
  column?: number
  severity: 'critical' | 'high' | 'medium' | 'low'
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

  private addError(category: ValidationMessage['category'], message: string, severity: ValidationMessage['severity'] = 'high'): void {
    this.errors.push({ type: 'error', category, message, severity })
    if (severity === 'critical') {
      this.hasCriticalError = true
    }
  }

  private addWarning(category: ValidationMessage['category'], message: string, severity: ValidationMessage['severity'] = 'medium'): void {
    this.warnings.push({ type: 'warning', category, message, severity })
  }

  private addInfo(category: ValidationMessage['category'], message: string, severity: ValidationMessage['severity'] = 'low'): void {
    this.info.push({ type: 'info', category, message, severity })
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
        this.addError('syntax', 'Missing DOCTYPE declaration - required for minimal HTML', 'critical')
      } else {
        // Full document but missing DOCTYPE - still an error but not critical
        this.addError('syntax', 'Missing DOCTYPE declaration', 'high')
      }
    }

    // Check for viewport meta tag
    if (!html.includes('viewport')) {
      this.addError('accessibility', 'Missing viewport meta tag for mobile responsiveness', 'high')
    }

    // Check for charset
    if (!html.includes('charset')) {
      this.addWarning('syntax', 'Missing charset declaration', 'medium')
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
      this.addError('accessibility', 'Missing h1 heading for page title', 'high')
    }

    // Check for multiple h1
    const h1Count = (html.match(/<h1[^>]*>/g) || []).length
    if (h1Count > 1) {
      this.addWarning('accessibility', `Multiple h1 elements found (${h1Count}). Should have only one`, 'medium')
    }

    // Check for alt attributes on images
    const imgTags = html.match(/<img[^>]*>/g) || []
    imgTags.forEach(img => {
      if (!img.includes('alt=')) {
        this.addError('accessibility', 'Image missing alt attribute', 'high')
      }
    })

    // Check for lang attribute
    if (!html.match(/<html[^>]*lang=/)) {
      this.addWarning('accessibility', 'Missing lang attribute on <html> tag', 'medium')
    }
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