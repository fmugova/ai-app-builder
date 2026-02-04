// utils/extractInlineStyles.ts
// Extracts inline styles from HTML and converts them to CSS classes

interface ExtractResult {
  html: string
  css: string
}

export function extractInlineStyles(html: string): ExtractResult {
  if (!html) {
    return { html: '', css: '' }
  }

  // Parse HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Track unique style combinations
  const styleMap = new Map<string, string>()
  let classCounter = 0

  // Find all elements with style attribute
  const elementsWithStyle = doc.querySelectorAll('[style]')
  
  elementsWithStyle.forEach((element) => {
    const inlineStyle = element.getAttribute('style')
    if (!inlineStyle) return

    // Normalize style string (remove extra spaces, sort properties)
    const normalizedStyle = normalizeStyleString(inlineStyle)
    
    // Check if we've seen this style combination before
    let className = styleMap.get(normalizedStyle)
    
    if (!className) {
      // Create new class name
      className = `extracted-style-${classCounter++}`
      styleMap.set(normalizedStyle, className)
    }

    // Add class to element
    const existingClasses = element.getAttribute('class') || ''
    element.setAttribute('class', `${existingClasses} ${className}`.trim())
    
    // Remove inline style
    element.removeAttribute('style')
  })

  // Generate CSS from styleMap
  let css = ''
  styleMap.forEach((className, styleString) => {
    css += `.${className} { ${styleString} }\n`
  })

  return {
    html: doc.body.innerHTML,
    css: css.trim()
  }
}

function normalizeStyleString(style: string): string {
  // Split into individual declarations
  const declarations = style
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0)
    .map(d => {
      const [prop, val] = d.split(':').map(s => s.trim())
      return `${prop}: ${val}`
    })
    .sort() // Sort for consistency
    .join('; ')
  
  return declarations + ';'
}

// Alternative: Generate hash-based class names for better caching
export function extractInlineStylesWithHash(html: string): ExtractResult {
  if (!html) {
    return { html: '', css: '' }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const styleMap = new Map<string, string>()

  const elementsWithStyle = doc.querySelectorAll('[style]')
  
  elementsWithStyle.forEach((element) => {
    const inlineStyle = element.getAttribute('style')
    if (!inlineStyle) return

    const normalizedStyle = normalizeStyleString(inlineStyle)
    
    // Generate hash from style string
    const hash = simpleHash(normalizedStyle)
    const className = `style-${hash}`
    
    styleMap.set(normalizedStyle, className)

    const existingClasses = element.getAttribute('class') || ''
    element.setAttribute('class', `${existingClasses} ${className}`.trim())
    
    element.removeAttribute('style')
  })

  let css = ''
  styleMap.forEach((className, styleString) => {
    css += `.${className} { ${styleString} }\n`
  })

  return {
    html: doc.body.innerHTML,
    css: css.trim()
  }
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
