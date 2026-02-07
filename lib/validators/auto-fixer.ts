// lib/validators/auto-fixer.ts
// Automatic code fixing for common validation issues

import { ValidationResult } from './code-validator'

export interface AutoFixResult {
  fixed: string
  appliedFixes: string[]
  remainingIssues: number
}

export class CodeAutoFixer {
  private appliedFixes: string[] = []

  autoFix(html: string, validationResult: ValidationResult): AutoFixResult {
    this.appliedFixes = []
    let fixed = html

    // Get only auto-fixable issues
    const autoFixableIssues = validationResult.errors
      .concat(validationResult.warnings)
      .concat(validationResult.info)
      .filter(issue => issue.fix && this.isAutoFixable(issue.message))

    // Apply fixes in order of importance
    fixed = this.fixDoctype(fixed)
    fixed = this.fixCharset(fixed)
    fixed = this.fixViewport(fixed)
    fixed = this.fixLangAttribute(fixed)
    fixed = this.fixImageLazyLoading(fixed)
    fixed = this.fixExternalLinks(fixed)

    const remainingIssues = 
      validationResult.summary.errors + 
      validationResult.summary.warnings + 
      validationResult.summary.info - 
      this.appliedFixes.length

    return {
      fixed,
      appliedFixes: this.appliedFixes,
      remainingIssues,
    }
  }

  private isAutoFixable(message: string): boolean {
    const autoFixablePatterns = [
      'Missing or incorrect DOCTYPE',
      'Missing charset',
      'Missing viewport',
      'Missing lang attribute',
      'missing lazy loading',
      'External link missing rel',
    ]
    
    return autoFixablePatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  private fixDoctype(html: string): string {
    const trimmed = html.trim()
    if (!trimmed.startsWith('<!DOCTYPE html>')) {
      this.appliedFixes.push('Added DOCTYPE declaration')
      return '<!DOCTYPE html>\n' + html
    }
    return html
  }

  private fixCharset(html: string): string {
    if (!html.includes('charset="UTF-8"')) {
      const headMatch = html.match(/(<head[^>]*>)/i)
      if (headMatch) {
        this.appliedFixes.push('Added charset meta tag')
        return html.replace(
          headMatch[1],
          `${headMatch[1]}\n  <meta charset="UTF-8">`
        )
      }
    }
    return html
  }

  private fixViewport(html: string): string {
    if (!html.includes('name="viewport"')) {
      const charsetMatch = html.match(/(<meta charset="UTF-8">)/i)
      if (charsetMatch) {
        this.appliedFixes.push('Added viewport meta tag')
        return html.replace(
          charsetMatch[1],
          `${charsetMatch[1]}\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`
        )
      } else {
        const headMatch = html.match(/(<head[^>]*>)/i)
        if (headMatch) {
          this.appliedFixes.push('Added viewport meta tag')
          return html.replace(
            headMatch[1],
            `${headMatch[1]}\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`
          )
        }
      }
    }
    return html
  }

  private fixLangAttribute(html: string): string {
    const htmlTagMatch = html.match(/(<html)([^>]*>)/i)
    if (htmlTagMatch && !htmlTagMatch[0].includes('lang=')) {
      this.appliedFixes.push('Added lang attribute to html tag')
      return html.replace(
        htmlTagMatch[0],
        `${htmlTagMatch[1]} lang="en"${htmlTagMatch[2]}`
      )
    }
    return html
  }

  private fixImageLazyLoading(html: string): string {
    const imgMatches = html.match(/<img[^>]*>/g)
    if (!imgMatches) return html

    let fixed = html
    let addedCount = 0

    imgMatches.forEach(img => {
      if (!img.includes('loading=')) {
        // Only add lazy loading to images that aren't likely above the fold
        const isLikelyAboveFold = 
          img.includes('hero') || 
          img.includes('logo') || 
          img.includes('banner')
          
        if (!isLikelyAboveFold) {
          const fixedImg = img.replace(/<img/, '<img loading="lazy"')
          fixed = fixed.replace(img, fixedImg)
          addedCount++
        }
      }
    })

    if (addedCount > 0) {
      this.appliedFixes.push(`Added lazy loading to ${addedCount} image(s)`)
    }

    return fixed
  }

  private fixExternalLinks(html: string): string {
    const linkMatches = html.match(/<a[^>]*href="http[^"]*"[^>]*>/g)
    if (!linkMatches) return html

    let fixed = html
    let addedCount = 0

    linkMatches.forEach(link => {
      if (!link.includes('rel=')) {
        const fixedLink = link.replace(/>$/, ' rel="noopener noreferrer">')
        fixed = fixed.replace(link, fixedLink)
        addedCount++
      }
    })

    if (addedCount > 0) {
      this.appliedFixes.push(`Added rel attributes to ${addedCount} external link(s)`)
    }

    return fixed
  }
}

// Factory function
export function autoFixCode(
  html: string, 
  validationResult: ValidationResult
): AutoFixResult {
  const fixer = new CodeAutoFixer()
  return fixer.autoFix(html, validationResult)
}
