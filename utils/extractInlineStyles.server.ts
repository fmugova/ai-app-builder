// utils/extractInlineStyles.server.ts
// Server-side version using jsdom for Node.js

import { JSDOM } from 'jsdom'

interface ExtractResult {
  html: string
  css: string
}

export function extractInlineStyles(html: string): ExtractResult {
  if (!html) {
    return { html: '', css: '' }
  }

  try {
    // Preserve DOCTYPE and structure
    const hasDoctype = html.toLowerCase().includes('<!doctype')
    
    // Create DOM from HTML
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Track unique style combinations
    const styleMap = new Map<string, string>()
    let classCounter = 0

    // Find all elements with style attribute
    const elementsWithStyle = document.querySelectorAll('[style]')
    
    elementsWithStyle.forEach((element: Element) => {
      const inlineStyle = element.getAttribute('style')
      if (!inlineStyle) return

      // Normalize style string
      const normalizedStyle = normalizeStyleString(inlineStyle)
      
      // Check if we've seen this style before
      let className = styleMap.get(normalizedStyle)
      
      if (!className) {
        className = `extracted-style-${classCounter++}`
        styleMap.set(normalizedStyle, className)
      }

      // Add class to element
      const existingClasses = element.getAttribute('class') || ''
      element.setAttribute('class', `${existingClasses} ${className}`.trim())
      
      // Remove inline style
      element.removeAttribute('style')
    })

    // Generate CSS
    let css = ''
    styleMap.forEach((className, styleString) => {
      css += `.${className} { ${styleString} }\n`
    })

    // Get the full HTML with structure preserved
    let processedHtml = dom.serialize()
    
    // Ensure DOCTYPE is present
    if (!processedHtml.toLowerCase().includes('<!doctype')) {
      processedHtml = '<!DOCTYPE html>\n' + processedHtml
    }

    return {
      html: processedHtml,
      css: css.trim()
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

// Use this in your API route to process AI-generated code
export function processGeneratedCode(html: string, css: string = ''): {
  html: string
  css: string
  hasInlineStyles: boolean
  hasInlineHandlers: boolean
} {
  const { html: cleanHtml, css: extractedCss } = extractInlineStyles(html)
  
  // Combine existing CSS with extracted CSS
  const combinedCss = [css, extractedCss]
    .filter(Boolean)
    .join('\n\n/* Extracted from inline styles */\n')

  // Check for inline event handlers
  const hasInlineHandlers = /(on\w+)=["']/.test(html)

  return {
    html: cleanHtml,
    css: combinedCss,
    hasInlineStyles: extractedCss.length > 0,
    hasInlineHandlers,
  }
}