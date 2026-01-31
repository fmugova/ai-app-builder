import { parse } from 'node-html-parser'

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  category: 'syntax' | 'security' | 'performance' | 'accessibility' | 'seo'
  message: string
  line?: number
  column?: number
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface ValidationResult {
  passed: boolean
  score: number // 0-100
  issues: ValidationIssue[]
  metrics: {
    htmlSize: number
    cssSize: number
    jsSize: number
    totalSize: number
    loadTime?: number
  }
  accessibility: {
    score: number
    issues: string[]
  }
  security: {
    score: number
    issues: string[]
  }
  performance: {
    score: number
    issues: string[]
  }
  seo: {
    score: number
    issues: string[]
  }
}

export async function validateHTML(html: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  let score = 100

  try {
    // Parse HTML
    const root = parse(html)

    // 1. SYNTAX VALIDATION
    if (!html.includes('<!DOCTYPE html>')) {
      issues.push({
        type: 'error',
        category: 'syntax',
        message: 'Missing DOCTYPE declaration',
        severity: 'high'
      })
      score -= 10
    }

    if (!root.querySelector('html')) {
      issues.push({
        type: 'error',
        category: 'syntax',
        message: 'Missing <html> tag',
        severity: 'critical'
      })
      score -= 15
    }

    if (!root.querySelector('head')) {
      issues.push({
        type: 'error',
        category: 'syntax',
        message: 'Missing <head> tag',
        severity: 'critical'
      })
      score -= 15
    }

    if (!root.querySelector('body')) {
      issues.push({
        type: 'error',
        category: 'syntax',
        message: 'Missing <body> tag',
        severity: 'critical'
      })
      score -= 15
    }

    // 2. SECURITY VALIDATION
    const securityIssues = validateSecurity(root, html)
    issues.push(...securityIssues.issues)
    score -= securityIssues.penalty

    // 3. ACCESSIBILITY VALIDATION
    const a11yIssues = validateAccessibility(root)
    issues.push(...a11yIssues.issues)
    score -= a11yIssues.penalty

    // 4. PERFORMANCE VALIDATION
    const perfIssues = validatePerformance(html)
    issues.push(...perfIssues.issues)
    score -= perfIssues.penalty

    // 5. SEO VALIDATION
    const seoIssues = validateSEO(root)
    issues.push(...seoIssues.issues)
    score -= seoIssues.penalty

    // Calculate metrics
    const metrics = {
      htmlSize: new Blob([html]).size,
      cssSize: extractCSS(html).length,
      jsSize: extractJS(html).length,
      totalSize: new Blob([html]).size,
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      metrics,
      accessibility: {
        score: 100 - a11yIssues.penalty,
        issues: a11yIssues.issues.map(i => i.message)
      },
      security: {
        score: 100 - securityIssues.penalty,
        issues: securityIssues.issues.map(i => i.message)
      },
      performance: {
        score: 100 - perfIssues.penalty,
        issues: perfIssues.issues.map(i => i.message)
      },
      seo: {
        score: 100 - seoIssues.penalty,
        issues: seoIssues.issues.map(i => i.message)
      }
    }

  } catch (error) {
    return {
      passed: false,
      score: 0,
      issues: [{
        type: 'error',
        category: 'syntax',
        message: `Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      }],
      metrics: {
        htmlSize: 0,
        cssSize: 0,
        jsSize: 0,
        totalSize: 0
      },
      accessibility: { score: 0, issues: [] },
      security: { score: 0, issues: [] },
      performance: { score: 0, issues: [] },
      seo: { score: 0, issues: [] }
    }
  }
}

function validateSecurity(root: any, html: string) {
  const issues: ValidationIssue[] = []
  let penalty = 0

  // Check for inline event handlers (XSS risk)
  if (html.match(/on\w+\s*=\s*["']/i)) {
    issues.push({
      type: 'warning',
      category: 'security',
      message: 'Inline event handlers detected - potential XSS risk',
      severity: 'high'
    })
    penalty += 10
  }

  // Check for eval() usage
  if (html.includes('eval(')) {
    issues.push({
      type: 'error',
      category: 'security',
      message: 'eval() usage detected - major security risk',
      severity: 'critical'
    })
    penalty += 20
  }

  // Check for innerHTML usage
  if (html.includes('.innerHTML')) {
    issues.push({
      type: 'warning',
      category: 'security',
      message: 'innerHTML usage detected - potential XSS risk',
      severity: 'medium'
    })
    penalty += 5
  }

  return { issues, penalty }
}

function validateAccessibility(root: any) {
  const issues: ValidationIssue[] = []
  let penalty = 0

  // Check for alt text on images
  const images = root.querySelectorAll('img')
  images.forEach((img: any) => {
    if (!img.getAttribute('alt')) {
      issues.push({
        type: 'warning',
        category: 'accessibility',
        message: 'Image missing alt attribute',
        severity: 'medium'
      })
      penalty += 2
    }
  })

  // Check for form labels
  const inputs = root.querySelectorAll('input:not([type="hidden"])')
  inputs.forEach((input: any) => {
    const id = input.getAttribute('id')
    if (id) {
      const label = root.querySelector(`label[for="${id}"]`)
      if (!label) {
        issues.push({
          type: 'warning',
          category: 'accessibility',
          message: 'Input missing associated label',
          severity: 'medium'
        })
        penalty += 2
      }
    }
  })

  // Check for heading structure
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length === 0) {
    issues.push({
      type: 'info',
      category: 'accessibility',
      message: 'No heading elements found',
      severity: 'low'
    })
    penalty += 1
  }

  return { issues, penalty }
}

function validatePerformance(html: string) {
  const issues: ValidationIssue[] = []
  let penalty = 0

  const size = new Blob([html]).size

  // Check file size
  if (size > 500000) { // 500KB
    issues.push({
      type: 'warning',
      category: 'performance',
      message: `Large HTML size: ${(size / 1024).toFixed(2)}KB - may affect load time`,
      severity: 'medium'
    })
    penalty += 5
  }

  // Check for render-blocking resources
  if (html.match(/<script[^>]*(?!defer|async)/gi)?.length) {
    issues.push({
      type: 'info',
      category: 'performance',
      message: 'Consider adding defer/async to script tags',
      severity: 'low'
    })
    penalty += 2
  }

  return { issues, penalty }
}

function validateSEO(root: any) {
  const issues: ValidationIssue[] = []
  let penalty = 0

  // Check for title
  const title = root.querySelector('title')
  if (!title) {
    issues.push({
      type: 'error',
      category: 'seo',
      message: 'Missing <title> tag',
      severity: 'high'
    })
    penalty += 10
  } else if (title.text.length < 10) {
    issues.push({
      type: 'warning',
      category: 'seo',
      message: 'Title tag too short (minimum 10 characters recommended)',
      severity: 'medium'
    })
    penalty += 5
  }

  // Check for meta description
  const metaDesc = root.querySelector('meta[name="description"]')
  if (!metaDesc) {
    issues.push({
      type: 'warning',
      category: 'seo',
      message: 'Missing meta description',
      severity: 'medium'
    })
    penalty += 5
  }

  // Check for viewport meta
  const viewport = root.querySelector('meta[name="viewport"]')
  if (!viewport) {
    issues.push({
      type: 'warning',
      category: 'seo',
      message: 'Missing viewport meta tag - affects mobile SEO',
      severity: 'high'
    })
    penalty += 8
  }

  return { issues, penalty }
}

function extractCSS(html: string): string {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  return match ? match.join('') : ''
}

function extractJS(html: string): string {
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
  return match ? match.join('') : ''
}
