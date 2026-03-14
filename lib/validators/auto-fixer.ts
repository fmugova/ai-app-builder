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

  /**
   * Full auto-fix: structural fixes + inline event handler conversion.
   * Used by the on-demand Auto-Fix button (user-initiated).
   */
  autoFix(html: string, validationResult: ValidationResult): AutoFixResult {
    console.log('🔧 AUTO-FIXER STARTING...')
    this.appliedFixes = []
    let fixed = html
    const originalLength = fixed.length

    fixed = this.applyStructuralFixes(fixed)
    fixed = this.fixInlineEventHandlers(fixed)
    fixed = this.addCSSVariables(fixed)
    fixed = this.extractLargeScripts(fixed)

    console.log('✅ Applied fixes:', this.appliedFixes)
    console.log('📏 Code length change:', originalLength, '→', fixed.length)

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

  /**
   * Structural-only auto-fix: safe to run automatically in the generation pipeline.
   * Skips inline handler conversion (would break onsubmit="handler(event)") and
   * CSS variable injection (Tailwind CDN pages rarely have <style> blocks).
   */
  autoFixStructural(html: string, siteFiles?: Record<string, string>): AutoFixResult {
    this.appliedFixes = []
    let fixed = this.applyStructuralFixes(html)
    fixed = this.injectOpenGraphTags(fixed)
    fixed = this.injectAuthScript(fixed)
    fixed = this.injectResourceHints(fixed)
    // Accessibility pass
    fixed = this.injectSkipLink(fixed)
    fixed = this.injectMainRole(fixed)
    fixed = this.injectImgAlts(fixed)
    fixed = this.injectAriaLandmarks(fixed)
    // Consent + analytics (only when those files are present in the site)
    fixed = this.injectConsentAndAnalyticsScripts(fixed, siteFiles ?? {})
    return { fixed, appliedFixes: this.appliedFixes, remainingIssues: 0 }
  }

  private applyStructuralFixes(html: string): string {
    let fixed = html
    fixed = this.fixDoctype(fixed)
    fixed = this.fixCharset(fixed)
    fixed = this.fixViewport(fixed)
    fixed = this.fixLangAttribute(fixed)
    fixed = this.fixMissingTitle(fixed)
    fixed = this.fixMissingH1(fixed)
    fixed = this.fixMultipleH1Elements(fixed)
    fixed = this.fixMissingMetaDescription(fixed)
    fixed = this.fixImageLazyLoading(fixed)
    fixed = this.fixExternalLinks(fixed)
    return fixed
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

  private fixMultipleH1Elements(html: string): string {
    // Find all h1 elements
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi)
    
    if (!h1Matches || h1Matches.length <= 1) {
      return html // No issue or only one h1
    }

    console.log(`🔧 Found ${h1Matches.length} h1 elements, converting extras to h2...`)
    
    let fixed = html
    // Keep the first h1, convert the rest to h2
    for (let i = 1; i < h1Matches.length; i++) {
      const h1 = h1Matches[i]
      const h2 = h1.replace(/<h1/gi, '<h2').replace(/<\/h1>/gi, '</h2>')
      fixed = fixed.replace(h1, h2)
    }
    
    this.appliedFixes.push(`Converted ${h1Matches.length - 1} duplicate h1 element(s) to h2`)
    return fixed
  }

  private fixInlineEventHandlers(html: string): string {
    // Guard: skip very large inputs to prevent polynomial ReDoS on the event-handler regex
    if (html.length > 500_000) {
      console.warn('[auto-fixer] fixInlineEventHandlers skipped — input exceeds 500 KB')
      return html
    }

    let fixed = html
    let fixedCount = 0

    // Find all inline event handlers (onclick, onload, onmouseover, etc.)
    const eventHandlerPattern = /(<[^>]+)\s+(on\w+)="([^"]+)"([^>]*>)/gi
    const matches = Array.from(html.matchAll(eventHandlerPattern))

    if (matches.length === 0) {
      return html
    }

    // Detect if a handler is safe to hoist to a static addEventListener.
    // Handlers with dotted-path arguments (item.id, data.value) are generated
    // inside render() loops — the arg is a closure variable that won't exist in
    // a static DOMContentLoaded listener. Skip those to avoid breaking app logic.
    const isDynamicArg = (code: string): boolean => {
      const argsMatch = code.match(/\(([^)]*)\)/)
      if (!argsMatch || !argsMatch[1].trim()) return false
      return argsMatch[1].split(',').some(arg => /[a-zA-Z]\w*\.\w+/.test(arg.trim()))
    }

    console.log(`🔧 Found ${matches.length} inline event handler(s), converting safe ones to addEventListener...`)

    let idCounter = 1
    const scriptSegments: string[] = []

    for (const match of matches) {
      const fullMatch = match[0]
      const beforeHandler = match[1]
      const eventType = match[2]
      const handlerCode = match[3]
      const afterHandler = match[4]

      // Skip handlers with dynamic arguments — they must stay inline or use data-*
      if (isDynamicArg(handlerCode)) {
        console.log(`⏭️  Skipping dynamic handler: ${handlerCode}`)
        continue
      }

      // Check if element already has an id
      const idMatch = fullMatch.match(/id="([^"]+)"/)
      const elementId = idMatch ? idMatch[1] : `elem-${idCounter++}`

      // Build the fixed element tag
      let fixedElement: string
      // Escape eventType before using in RegExp to prevent regex injection
      // (eventType is captured by \w+ so only word chars, but escaping is explicit defence-in-depth)
      const safeEventTypeRe = eventType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (idMatch) {
        fixedElement = fullMatch.replace(new RegExp(`\\s+${safeEventTypeRe}="[^"]+"`), '')
      } else {
        fixedElement = `${beforeHandler} id="${elementId}"${afterHandler}`.replace(new RegExp(`\\s+${safeEventTypeRe}="[^"]+"`), '')
      }

      // Create event listener script
      const event = eventType.replace(/^on/, '')
      const listenerScript = `document.getElementById('${elementId}').addEventListener('${event}', function(e) { ${handlerCode} });`
      scriptSegments.push(listenerScript)

      fixed = fixed.replace(fullMatch, fixedElement)
      fixedCount++
    }

    // Add all event listeners in a DOMContentLoaded block
    if (scriptSegments.length > 0) {
      const eventListenerScript = `
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      ${scriptSegments.join('\n      ')}
    });
  </script>`

      const bodyCloseMatch = fixed.match(/<\/body>/i)
      if (bodyCloseMatch) {
        fixed = fixed.replace(/<\/body>/i, `${eventListenerScript}\n</body>`)
      }

      this.appliedFixes.push(`Converted ${fixedCount} inline event handler(s) to addEventListener`)
    }

    return fixed
  }

  // ── New structural injections ─────────────────────────────────────────────

  private _escapeAttr(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  /**
   * Injects Open Graph + Twitter Card meta tags if none are present.
   * Derives og:title and og:description from existing <title> and
   * <meta name="description"> tags (already fixed by earlier passes).
   */
  private injectOpenGraphTags(html: string): string {
    if (html.includes('property="og:title"') || html.includes("property='og:title'")) {
      return html
    }

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? this._escapeAttr(titleMatch[1].trim()) : ''
    if (!title) return html

    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    const desc = descMatch ? this._escapeAttr(descMatch[1].trim()) : title

    const ogBlock = [
      `  <meta property="og:type" content="website">`,
      `  <meta property="og:title" content="${title}">`,
      `  <meta property="og:description" content="${desc}">`,
      `  <meta name="twitter:card" content="summary_large_image">`,
      `  <meta name="twitter:title" content="${title}">`,
      `  <meta name="twitter:description" content="${desc}">`,
    ].join('\n')

    // Insert after <meta name="description"> if present, otherwise before </head>
    const descTagMatch = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)
    if (descTagMatch) {
      const idx = html.indexOf(descTagMatch[0]) + descTagMatch[0].length
      this.appliedFixes.push('Injected Open Graph / Twitter Card meta tags')
      return html.slice(0, idx) + '\n' + ogBlock + html.slice(idx)
    }

    const headClose = html.match(/<\/head>/i)
    if (headClose) {
      this.appliedFixes.push('Injected Open Graph / Twitter Card meta tags')
      return html.replace(/<\/head>/i, ogBlock + '\n</head>')
    }

    return html
  }

  /**
   * Ensures auth.js, forms.js, and toast.js are all present immediately before
   * <script src="script.js">. Inserts only the ones that are missing.
   * No-ops if script.js is absent (auth/form pages that don't use it).
   */
  private injectAuthScript(html: string): string {
    const scriptJsMatch = html.match(/<script[^>]+src=["']script\.js["'][^>]*><\/script>/i)
    if (!scriptJsMatch) return html

    const missing: string[] = []
    if (!html.includes('src="auth.js"') && !html.includes("src='auth.js'")) missing.push('auth.js')
    if (!html.includes('src="forms.js"') && !html.includes("src='forms.js'")) missing.push('forms.js')
    if (!html.includes('src="toast.js"') && !html.includes("src='toast.js'")) missing.push('toast.js')

    if (missing.length === 0) return html

    const prefix = missing.map((f) => `<script src="${f}"></script>`).join('\n  ')
    this.appliedFixes.push(`Injected ${missing.join(', ')} before script.js`)
    return html.replace(scriptJsMatch[0], `${prefix}\n  ${scriptJsMatch[0]}`)
  }

  /**
   * Adds <link rel="preconnect"> and <link rel="dns-prefetch"> hints for
   * external CDN origins referenced in the page's script/link tags.
   * Only origins not already hinted are added.
   */
  private injectResourceHints(html: string): string {
    if (html.includes('rel="preconnect"') || html.includes("rel='preconnect'")) {
      return html
    }

    // Collect unique CDN origins from script src and link href attributes
    const urlMatches = [
      ...Array.from(html.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi)),
      ...Array.from(html.matchAll(/<link[^>]+href=["'](https?:\/\/[^"']+)["']/gi)),
    ]

    const origins = new Set<string>()
    for (const m of urlMatches) {
      try {
        origins.add(new URL(m[1]).origin)
      } catch {
        // ignore malformed URLs
      }
    }

    if (origins.size === 0) return html

    const hints = Array.from(origins)
      .map(
        (o) =>
          `  <link rel="preconnect" href="${o}" crossorigin>\n  <link rel="dns-prefetch" href="${o}">`
      )
      .join('\n')

    // Insert after <meta charset> if present, otherwise after <head>
    const charsetMatch = html.match(/<meta[^>]+charset[^>]*>/i)
    if (charsetMatch) {
      const idx = html.indexOf(charsetMatch[0]) + charsetMatch[0].length
      this.appliedFixes.push(`Added resource hints for ${origins.size} CDN origin(s)`)
      return html.slice(0, idx) + '\n' + hints + html.slice(idx)
    }

    const headMatch = html.match(/<head[^>]*>/i)
    if (headMatch) {
      this.appliedFixes.push(`Added resource hints for ${origins.size} CDN origin(s)`)
      return html.replace(headMatch[0], headMatch[0] + '\n' + hints)
    }

    return html
  }

  // ── Accessibility injections ──────────────────────────────────────────────

  /** Injects a skip-to-main-content link as first child of <body>. */
  private injectSkipLink(html: string): string {
    if (html.includes('#main-content') || html.includes('skip-to') || html.includes('skipnav')) {
      return html
    }
    const bodyMatch = html.match(/<body([^>]*)>/i)
    if (!bodyMatch) return html
    const skipLink = `<a href="#main-content" style="position:absolute;top:-999px;left:-999px;width:1px;height:1px;overflow:hidden;z-index:99999;background:#fff;color:#111;padding:.75rem 1.25rem;text-decoration:none;font-weight:600;border-radius:0 0 8px 0" onfocus="this.style.top='0';this.style.left='0';this.style.width='auto';this.style.height='auto'" onblur="this.style.top='-999px';this.style.left='-999px';this.style.width='1px';this.style.height='1px'">Skip to main content</a>`
    this.appliedFixes.push('Injected skip-to-main-content link')
    return html.replace(bodyMatch[0], `${bodyMatch[0]}\n  ${skipLink}`)
  }

  /** Adds id="main-content" and role="main" to the first <main> element. */
  private injectMainRole(html: string): string {
    if (html.includes('id="main-content"') || html.includes("id='main-content'")) return html
    const mainMatch = html.match(/<main(?![^>]*\bid=)([^>]*)>/i)
    if (!mainMatch) return html
    this.appliedFixes.push('Added id="main-content" and role="main" to <main>')
    return html.replace(mainMatch[0],
      `<main id="main-content" role="main"${mainMatch[1]}>`)
  }

  /** Adds descriptive alt text to <img> tags missing the alt attribute. */
  private injectImgAlts(html: string): string {
    let count = 0
    const result = html.replace(/<img([^>]*)>/gi, (fullTag, attrs) => {
      if (/role=["'](presentation|none)["']/i.test(attrs)) return fullTag
      if (/\balt=/i.test(attrs)) {
        // Has alt= but it might be empty — replace empty alts on content images
        const altVal = (attrs.match(/\balt=["']([^"']*)["']/i) ?? [])[1] ?? null
        if (altVal !== null && altVal.trim() === '') {
          const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i)
          const generated = srcMatch ? this._altFromSrc(srcMatch[1]) : ''
          if (!generated) return fullTag
          count++
          return fullTag.replace(/\balt=["']['"]/, `alt="${generated}"`)
        }
        return fullTag
      }
      // No alt at all — generate from src
      const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i)
      const generated = srcMatch ? this._altFromSrc(srcMatch[1]) : 'Image'
      count++
      return `<img alt="${generated}"${attrs}>`
    })
    if (count > 0) this.appliedFixes.push(`Generated alt text for ${count} image(s)`)
    return result
  }

  private _altFromSrc(src: string): string {
    try {
      const picsumSeed = src.match(/picsum\.photos\/seed\/([^/?]+)/)
      if (picsumSeed) {
        return picsumSeed[1].replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()).trim()
      }
      if (src.includes('unsplash.com')) return 'Photo'
      if (src.includes('dicebear.com')) {
        const seed = new URL(src).searchParams.get('seed')
        return seed ? `${seed} avatar` : 'Avatar'
      }
      const filename = new URL(src).pathname.split('/').pop() ?? ''
      const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Image'
    } catch {
      return 'Image'
    }
  }

  /** Adds explicit ARIA landmark roles to <header>, <footer>, and <nav>. */
  private injectAriaLandmarks(html: string): string {
    let fixed = html
    // <header> without role
    fixed = fixed.replace(/<header(?![^>]*\brole=)([^>]*)>/gi,
      (_, attrs) => `<header role="banner"${attrs}>`)
    // <footer> without role
    fixed = fixed.replace(/<footer(?![^>]*\brole=)([^>]*)>/gi,
      (_, attrs) => `<footer role="contentinfo"${attrs}>`)
    // <nav> without aria-label
    fixed = fixed.replace(/<nav(?![^>]*\baria-label=)([^>]*)>/gi,
      (_, attrs) => `<nav aria-label="Site navigation"${attrs}>`)
    if (fixed !== html) this.appliedFixes.push('Added ARIA landmark roles to header/footer/nav')
    return fixed
  }

  /**
   * Injects <script src="consent.js"> and/or <script src="analytics.js"> into
   * <head> when those files are present in the site's generated file set.
   * Both use defer so they don't block rendering.
   */
  private injectConsentAndAnalyticsScripts(html: string, siteFiles: Record<string, string>): string {
    const hasConsent   = 'consent.js'   in siteFiles
    const hasAnalytics = 'analytics.js' in siteFiles
    if (!hasConsent && !hasAnalytics) return html

    const hasConsentTag   = html.includes('src="consent.js"')   || html.includes("src='consent.js'")
    const hasAnalyticsTag = html.includes('src="analytics.js"') || html.includes("src='analytics.js'")
    if (hasConsentTag && hasAnalyticsTag) return html

    const tags: string[] = []
    if (hasConsent   && !hasConsentTag)   tags.push('  <script src="consent.js" defer></script>')
    if (hasAnalytics && !hasAnalyticsTag) tags.push('  <script src="analytics.js" defer></script>')
    if (tags.length === 0) return html

    this.appliedFixes.push(`Injected ${tags.map((t) => t.includes('consent') ? 'consent.js' : 'analytics.js').join(', ')}`)
    return html.replace(/<\/head>/i, tags.join('\n') + '\n</head>')
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
