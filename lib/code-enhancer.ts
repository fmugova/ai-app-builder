// lib/code-enhancer.ts
// Automatically enhance generated code with quality improvements

export interface EnhancementOptions {
  addMediaQueries?: boolean
  addFocusStyles?: boolean
  addCSSVariables?: boolean
  addFormLabels?: boolean
  addARIA?: boolean
  addReducedMotion?: boolean
  addCopyrightFooter?: boolean
  removeTechnicalDescriptions?: boolean
}

export interface EnhancedCode {
  html: string
  css: string
  js: string
  enhancements: string[]
}

export class CodeEnhancer {
  private enhancements: string[] = []

  /**
   * Enhance HTML with accessibility and quality improvements
   */
  enhanceHTML(html: string, options: EnhancementOptions): string {
    let enhanced = html

    // Remove History API calls that break in iframes
    enhanced = this.removeHistoryAPI(enhanced)

    // Remove technical descriptions if present
    if (options.removeTechnicalDescriptions) {
      enhanced = this.removeTechnicalDescriptions(enhanced)
    }

    // Add BuildFlow copyright footer
    if (options.addCopyrightFooter) {
      enhanced = this.addCopyrightFooter(enhanced)
    }

    // Add form labels for inputs without them
    if (options.addFormLabels) {
      enhanced = this.addFormLabels(enhanced)
    }

    // Add ARIA attributes
    if (options.addARIA) {
      enhanced = this.addBasicARIA(enhanced)
    }

    return enhanced
  }

  /**
   * Enhance CSS with responsive design and accessibility
   */
  enhanceCSS(css: string, options: EnhancementOptions): string {
    let enhanced = css
    const additions: string[] = []

    // Extract colors for CSS variables
    if (options.addCSSVariables && !css.includes('--')) {
      const variables = this.extractCSSVariables(css)
      if (variables) {
        additions.push(variables)
        this.enhancements.push('Added CSS custom properties (variables)')
      }
    }

    // Add focus styles if missing
    if (options.addFocusStyles && !css.includes(':focus')) {
      additions.push(this.generateFocusStyles())
      this.enhancements.push('Added :focus styles for keyboard navigation')
    }

    // Add responsive media queries
    if (options.addMediaQueries && !css.includes('@media')) {
      additions.push(this.generateMediaQueries())
      this.enhancements.push('Added responsive media queries')
    }

    // Add reduced motion support
    if (options.addReducedMotion && !css.includes('prefers-reduced-motion')) {
      additions.push(this.generateReducedMotion())
      this.enhancements.push('Added prefers-reduced-motion support')
    }

    // Combine original CSS with additions
    if (additions.length > 0) {
      enhanced = css + '\n\n/* Auto-generated accessibility and responsive enhancements */\n' + additions.join('\n\n')
    }

    return enhanced
  }

  /**
   * Add labels to form inputs
   */
  private addFormLabels(html: string): string {
    let enhanced = html
    let labelCounter = 0

    // Find inputs without associated labels
    const inputRegex = /<input([^>]*)>/gi
    
    enhanced = enhanced.replace(inputRegex, (match, attrs) => {
      // Skip if already has a label or aria-label
      if (attrs.includes('aria-label') || attrs.includes('aria-labelledby')) {
        return match
      }

      // Check if there's an id
      const idMatch = attrs.match(/id=["']([^"']+)["']/)
      const typeMatch = attrs.match(/type=["']([^"']+)["']/)
      const placeholderMatch = attrs.match(/placeholder=["']([^"']+)["']/)
      
      const inputId = idMatch ? idMatch[1] : `input-${labelCounter++}`
      const inputType = typeMatch ? typeMatch[1] : 'text'
      const labelText = placeholderMatch ? placeholderMatch[1] : (inputType.charAt(0).toUpperCase() + inputType.slice(1))

      // Add id if missing
      let newAttrs = attrs
      if (!idMatch) {
        newAttrs = `id="${inputId}" ${attrs}`
      }

      // Return label + input
      return `<label for="${inputId}">${labelText}</label>\n    <input${newAttrs}>`
    })

    if (labelCounter > 0) {
      this.enhancements.push(`Added ${labelCounter} form labels`)
    }

    return enhanced
  }

  /**
   * Add basic ARIA attributes
   */
  private addBasicARIA(html: string): string {
    let enhanced = html

    // Add role="main" to main content if <main> doesn't exist
    if (!html.includes('<main') && html.includes('<div class="container')) {
      enhanced = enhanced.replace(/<div class="container"/, '<div class="container" role="main"')
      this.enhancements.push('Added role="main" to container')
    }

    // Add role="navigation" to nav-like divs
    if (!html.includes('<nav') && html.match(/<div[^>]*class="[^"]*nav/)) {
      enhanced = enhanced.replace(/<div([^>]*class="[^"]*nav[^"]*"[^>]*)>/, '<div$1 role="navigation">')
      this.enhancements.push('Added role="navigation"')
    }

    return enhanced
  }

  /**
   * Add BuildFlow copyright footer
   */
  private addCopyrightFooter(html: string): string {
    // Check if copyright already exists
    if (html.includes('BuildFlow 2025') || html.includes('© BuildFlow')) {
      return html
    }

    // Add footer before closing body tag
    const footerHTML = `
  <!-- Copyright Footer -->
  <footer class="mt-auto py-4 text-center text-sm text-gray-500 border-t border-gray-200">
    <p>© BuildFlow 2025. All rights reserved.</p>
  </footer>`

    const bodyCloseIndex = html.lastIndexOf('</body>')
    if (bodyCloseIndex !== -1) {
      const enhanced = html.slice(0, bodyCloseIndex) + footerHTML + '\n' + html.slice(bodyCloseIndex)
      this.enhancements.push('Added copyright footer')
      return enhanced
    }

    return html
  }

  /**
   * Remove technical descriptions and feature lists
   */
  private removeTechnicalDescriptions(html: string): string {
    let cleaned = html

    // Remove technical description sections that often appear at the end
    // Pattern 1: Descriptions starting with "This is a complete" or similar
    const descriptionPatterns = [
      /<!--\s*This is a complete.*?-->/gis,
      /<!--\s*\*\*.*?-->/gis,
      /<!\[CDATA\[.*?\]\]>/gis,
      /```.*?```/gis, // Remove any code fence blocks that snuck through
    ]

    descriptionPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '')
    })

    // Remove long comment blocks with technical details (like in the image)
    // Look for very long HTML comments (> 500 chars)
    cleaned = cleaned.replace(/<!--[\s\S]{500,}?-->/g, '')

    // Remove trailing text after </html> that might contain descriptions
    const htmlEndIndex = cleaned.lastIndexOf('</html>')
    if (htmlEndIndex !== -1) {
      cleaned = cleaned.slice(0, htmlEndIndex + 7) // Keep </html> but trim after
    }

    if (cleaned.length < html.length) {
      this.enhancements.push('Removed technical descriptions')
    }

    return cleaned
  }

  /**
   * Remove History API calls that don't work in iframes
   */
  private removeHistoryAPI(html: string): string {
    let cleaned = html
    let modified = false

    // Remove history.pushState() calls
    if (cleaned.includes('history.pushState')) {
      cleaned = cleaned.replace(/history\.pushState\([^)]*\);?/g, '// history.pushState removed (not supported in iframe)')
      modified = true
    }

    // Remove history.replaceState() calls
    if (cleaned.includes('history.replaceState')) {
      cleaned = cleaned.replace(/history\.replaceState\([^)]*\);?/g, '// history.replaceState removed (not supported in iframe)')
      modified = true
    }

    // Remove window.location.hash assignments
    if (cleaned.match(/window\.location\.hash\s*=/)) {
      cleaned = cleaned.replace(/window\.location\.hash\s*=\s*[^;]+;?/g, '// window.location.hash removed (not supported in iframe)')
      modified = true
    }

    if (modified) {
      this.enhancements.push('Removed History API calls (not supported in iframe)')
    }

    return cleaned
  }

  /**
   * Extract common colors and create CSS variables
   */
  private extractCSSVariables(css: string): string | null {
    // Extract common color values
    const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g
    const colors = css.match(colorRegex) || []
    
    if (colors.length === 0) return null

    // Count color occurrences
    const colorCounts = new Map<string, number>()
    colors.forEach(color => {
      const normalized = color.toLowerCase()
      colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + 1)
    })

    // Only create variables for colors used more than once
    const variables: string[] = []
    let varIndex = 0
    const colorMap = new Map<string, string>()

    colorCounts.forEach((count, color) => {
      if (count > 1) {
        const varName = `--color-${varIndex++}`
        colorMap.set(color, varName)
        variables.push(`  ${varName}: ${color};`)
      }
    })

    if (variables.length === 0) return null

    return `:root {
${variables.join('\n')}
}`
  }

  /**
   * Generate comprehensive focus styles
   */
  private generateFocusStyles(): string {
    return `/* Keyboard navigation focus styles */
a:focus,
button:focus,
input:focus,
textarea:focus,
select:focus {
  outline: 2px solid #4A90E2;
  outline-offset: 2px;
}

/* Remove focus outline for mouse users */
a:focus:not(:focus-visible),
button:focus:not(:focus-visible),
input:focus:not(:focus-visible),
textarea:focus:not(:focus-visible),
select:focus:not(:focus-visible) {
  outline: none;
}

/* Enhanced focus-visible styles */
a:focus-visible,
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.2);
}`
  }

  /**
   * Generate responsive media queries
   */
  private generateMediaQueries(): string {
    return `/* Responsive design - Mobile first */
/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) {
  .container {
    max-width: 540px;
  }
}

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
  
  /* Stack layouts horizontally on tablets+ */
  .responsive-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) {
  .container {
    max-width: 960px;
  }
  
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) {
  .container {
    max-width: 1140px;
  }
}

/* Mobile-specific adjustments */
@media (max-width: 767px) {
  body {
    font-size: 14px;
  }
  
  h1 {
    font-size: 1.75rem;
  }
  
  h2 {
    font-size: 1.5rem;
  }
  
  /* Stack elements vertically on mobile */
  .responsive-flex {
    flex-direction: column;
  }
  
  /* Full-width buttons on mobile */
  button,
  .btn {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}`
  }

  /**
   * Generate reduced motion support
   */
  private generateReducedMotion(): string {
    return `/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`
  }

  /**
   * Enhance complete code bundle
   */
  enhanceCode(
    html: string,
    css: string,
    js: string,
    options: EnhancementOptions = {}
  ): EnhancedCode {
    // Reset enhancements
    this.enhancements = []

    // Default options
    const opts = {
      addMediaQueries: true,
      addFocusStyles: true,
      addCSSVariables: false, // Can slow down for large CSS
      addFormLabels: true,
      addARIA: true,
      addReducedMotion: true,
      addCopyrightFooter: true,
      removeTechnicalDescriptions: true,
      ...options,
    }

    // Enhance each part
    const enhancedHTML = this.enhanceHTML(html, opts)
    const enhancedCSS = this.enhanceCSS(css, opts)

    return {
      html: enhancedHTML,
      css: enhancedCSS,
      js, // JS typically doesn't need auto-enhancement
      enhancements: this.enhancements,
    }
  }
}

// Export singleton instance
export const codeEnhancer = new CodeEnhancer()

// Export helper function
export function enhanceGeneratedCode(
  html: string,
  css: string,
  js: string,
  options?: EnhancementOptions
): EnhancedCode {
  return codeEnhancer.enhanceCode(html, css, js, options)
}
