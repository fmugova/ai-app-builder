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
    console.log('🔧 AUTO-FIXER STARTING...')
    console.log('📊 Total issues found:', validationResult.summary.total)
    console.log('   - Errors:', validationResult.summary.errors)
    console.log('   - Warnings:', validationResult.summary.warnings)
    console.log('   - Info:', validationResult.summary.info)
    
    this.appliedFixes = []
    let fixed = html
    const originalLength = fixed.length

    // Apply fixes in order of importance
    fixed = this.fixDoctype(fixed)
    fixed = this.fixCharset(fixed)
    fixed = this.fixViewport(fixed)
    fixed = this.fixLangAttribute(fixed)
    fixed = this.fixMissingTitle(fixed)
    
    // NEW MANDATORY FIXES for h1 and meta description
    fixed = this.fixMissingH1(fixed)
    fixed = this.fixMissingMetaDescription(fixed)
    fixed = this.addCSSVariables(fixed)
    fixed = this.extractLargeScripts(fixed)
    
    fixed = this.fixImageLazyLoading(fixed)
    fixed = this.fixExternalLinks(fixed)

    console.log('✅ Applied fixes:', this.appliedFixes)
    console.log('📏 Code length change:', originalLength, '→', fixed.length, `(${fixed.length - originalLength > 0 ? '+' : ''}${fixed.length - originalLength})`)

    const remainingIssues = 
      validationResult.summary.errors + 
      validationResult.summary.warnings + 
      validationResult.summary.info - 
      this.appliedFixes.length

    console.log('📊 Remaining issues:', remainingIssues)

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
      console.log('🔧 Adding lang attribute...')
      this.appliedFixes.push('Added lang attribute to html tag')
      return html.replace(
        htmlTagMatch[0],
        `${htmlTagMatch[1]} lang="en"${htmlTagMatch[2]}`
      )
    }
    return html
  }

  private fixMissingTitle(html: string): string {
    if (html.includes('<title>') && html.includes('</title>')) {
      return html
    }

    console.log('🔧 Adding missing title tag...')

    // Extract h1 or create default
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const title = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : 'Welcome'

    const headMatch = html.match(/(<head[^>]*>)/i)
    if (headMatch) {
      this.appliedFixes.push('Added missing title tag')
      return html.replace(
        headMatch[1],
        `${headMatch[1]}\n  <title>${title}</title>`
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

  private fixMissingH1(html: string): string {
    // Check if h1 exists
    if (html.includes('<h1')) {
      return html
    }

    console.log('🔧 Adding missing h1...')

    // Try to find the first heading or title
    const titleMatch = html.match(/<title>(.*?)<\/title>/)
    const title = titleMatch ? titleMatch[1] : 'Welcome'

    // Find a good place to insert h1 (after <body> or in <header>)
    if (html.includes('<header')) {
      const headerMatch = html.match(/(<header[^>]*>)/i)
      if (headerMatch) {
        this.appliedFixes.push('Added missing h1 heading to header')
        return html.replace(
          headerMatch[1],
          `${headerMatch[1]}\n    <h1>${title}</h1>`
        )
      }
    }

    // Fallback: add after <body>
    const bodyMatch = html.match(/(<body[^>]*>)/i)
    if (bodyMatch) {
      this.appliedFixes.push('Added missing h1 heading after body')
      return html.replace(
        bodyMatch[1],
        `${bodyMatch[1]}\n  <header>\n    <h1>${title}</h1>\n  </header>`
      )
    }

    return html
  }

  private fixMissingMetaDescription(html: string): string {
    if (html.includes('name="description"')) {
      return html
    }

    console.log('🔧 Adding meta description...')

    // Extract title or create generic description
    const titleMatch = html.match(/<title>(.*?)<\/title>/)
    const title = titleMatch ? titleMatch[1] : 'Website'
    const description = `${title} - A professional web experience`

    const viewportMatch = html.match(/(<meta name="viewport"[^>]*>)/i)
    if (viewportMatch) {
      this.appliedFixes.push('Added meta description')
      return html.replace(
        viewportMatch[1],
        `${viewportMatch[1]}\n  <meta name="description" content="${description}">`
      )
    }

    const charsetMatch = html.match(/(<meta charset="UTF-8">)/i)
    if (charsetMatch) {
      this.appliedFixes.push('Added meta description')
      return html.replace(
        charsetMatch[1],
        `${charsetMatch[1]}\n  <meta name="description" content="${description}">`
      )
    }

    return html
  }

  private addCSSVariables(html: string): string {
    // Check if CSS variables already exist
    if (html.includes(':root') && html.includes('--')) {
      return html
    }

    console.log('🔧 Adding CSS variables...')

    const styleMatch = html.match(/(<style[^>]*>)([\s\S]*?)(<\/style>)/i)
    if (!styleMatch) {
      return html
    }

    const cssVariables = `
    :root {
      --primary-color: #3b82f6;
      --secondary-color: #8b5cf6;
      --text-color: #1f2937;
      --text-secondary: #6b7280;
      --bg-color: #ffffff;
      --bg-secondary: #f9fafb;
      --border-color: #e5e7eb;
      --spacing-xs: 0.5rem;
      --spacing-sm: 1rem;
      --spacing-md: 2rem;
      --spacing-lg: 4rem;
      --border-radius: 0.5rem;
      --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
    `

    this.appliedFixes.push('Added CSS custom properties')
    return html.replace(
      styleMatch[1],
      `${styleMatch[1]}${cssVariables}\n`
    )
  }

  private extractLargeScripts(html: string): string {
    const scriptMatches = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))
    let fixed = html
    let extractedCount = 0

    scriptMatches.forEach(match => {
      const scriptContent = match[1]
      const lineCount = scriptContent.split('\n').length

      // If script is larger than 50 lines, add a warning comment
      if (lineCount > 50) {
        const comment = `\n    /* ⚠️ Large script detected (${lineCount} lines) - Consider extracting to external file */\n    `
        fixed = fixed.replace(match[1], comment + match[1])
        extractedCount++
      }
    })

    if (extractedCount > 0) {
      this.appliedFixes.push(`Added warnings for ${extractedCount} large script(s)`)
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
