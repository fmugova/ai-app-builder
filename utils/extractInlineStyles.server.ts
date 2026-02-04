// utils/extractInlineStyles.server.ts
// Server-side version using regex for better compatibility

interface ExtractResult {
  html: string
  css: string
}

export function extractInlineStyles(html: string): ExtractResult {
  if (!html) {
    return { html: '', css: '' }
  }

  try {
    const styleMap = new Map<string, string>()
    let classCounter = 0
    let modifiedHtml = html

    const styleRegex = /<([a-z][a-z0-9]*)\s+([^>]*?)\s*style\s*=\s*["']([^"']+)["']([^>]*?)>/gi
    
    modifiedHtml = modifiedHtml.replace(styleRegex, (match, tagName, beforeStyle, styleContent, afterStyle) => {
      const normalizedStyle = normalizeStyleString(styleContent)
      
      let className = styleMap.get(normalizedStyle)
      
      if (!className) {
        className = `extracted-style-${classCounter++}`
        styleMap.set(normalizedStyle, className)
      }

      const classMatch = beforeStyle.match(/class\s*=\s*["']([^"']+)["']/i) || 
                         afterStyle.match(/class\s*=\s*["']([^"']+)["']/i)
      
      let newClass = className
      if (classMatch) {
        newClass = `${classMatch[1]} ${className}`
        beforeStyle = beforeStyle.replace(/class\s*=\s*["'][^"']*["']/i, '')
        afterStyle = afterStyle.replace(/class\s*=\s*["'][^"']*["']/i, '')
      }

      const attrs = [beforeStyle, afterStyle]
        .map(s => s.trim())
        .filter(s => s)
        .join(' ')
      
      return `<${tagName} ${attrs ? attrs + ' ' : ''}class="${newClass}">`
    })

    let cssContent = ''
    styleMap.forEach((className, styleString) => {
      cssContent += `.${className} { ${styleString} }\n`
    })

    return {
      html: modifiedHtml,
      css: cssContent.trim()
    }
  } catch (error) {
    console.error('Error extracting inline styles:', error)
    return { html, css: '' }
  }
}

function normalizeStyleString(style: string): string {
  const declarations = style
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0)
    .map(d => {
      const [prop, val] = d.split(':').map(s => s.trim())
      return `${prop}: ${val}`
    })
    .sort()
    .join('; ')
  
  return declarations + ';'
}

export function processGeneratedCode(html: string, css: string = ''): {
  html: string
  css: string
  hasInlineStyles: boolean
  hasInlineHandlers: boolean
} {
  const extracted = extractInlineStyles(html)
  
  const combinedCss = [css, extracted.css].filter(Boolean).join('\n\n')
  
  const cleanHtml = extracted.html
  const hasInlineHandlers = /on\w+\s*=\s*["'][^"']*["']/i.test(cleanHtml)
  
  return {
    html: cleanHtml,
    css: combinedCss,
    hasInlineStyles: extracted.css.length > 0,
    hasInlineHandlers,
  }
}

