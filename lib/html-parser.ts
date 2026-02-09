// lib/html-parser.ts
// Robust HTML parser with validation and auto-fix
// Solves: Parsing errors in generation pipeline

interface HTMLValidationError {
  type: 'missing_tag' | 'unclosed_tag' | 'invalid_structure' | 'syntax_error'
  message: string
  fix?: string
}

interface HTMLValidationResult {
  isValid: boolean
  errors: HTMLValidationError[]
  warnings: string[]
}

/**
 * Parse and clean generated HTML code
 */
export function parseGeneratedHTML(rawResponse: string): string {
  // Remove markdown fences
  let cleaned = rawResponse
    .replace(/```html\n?/gi, '')
    .replace(/```xml\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim()

  // Extract HTML
  const htmlMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) ||
                    cleaned.match(/<html[\s\S]*<\/html>/i)

  if (!htmlMatch) {
    // Fallback: Try to extract body content
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    
    if (bodyMatch) {
      cleaned = wrapInBasicHTML(bodyMatch[0])
    } else {
      // Last resort: assume it's just content
      cleaned = wrapInBasicHTML(`<body>\n${cleaned}\n</body>`)
    }
  } else {
    cleaned = htmlMatch[0]
  }

  // Validate and auto-fix
  const validation = validateHTML(cleaned)
  
  if (!validation.isValid) {
    cleaned = autoFixHTML(cleaned, validation.errors)
  }

  return cleaned
}

/**
 * Wrap content in basic HTML structure
 */
function wrapInBasicHTML(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Generated web application">
  <title>My App</title>
</head>
${content}
</html>`
}

/**
 * Validate HTML structure
 */
export function validateHTML(html: string): HTMLValidationResult {
  const errors: HTMLValidationError[] = []
  const warnings: string[] = []

  // Check 1: Has DOCTYPE
  if (!html.trim().startsWith('<!DOCTYPE html>')) {
    errors.push({
      type: 'missing_tag',
      message: 'Missing DOCTYPE declaration',
      fix: 'Add <!DOCTYPE html> at the beginning',
    })
  }

  // Check 2: Has required tags
  const requiredTags = [
    { tag: '<html', name: 'html' },
    { tag: '<head>', name: 'head' },
    { tag: '<body>', name: 'body' },
  ]

  for (const { tag, name } of requiredTags) {
    if (!html.includes(tag)) {
      errors.push({
        type: 'missing_tag',
        message: `Missing <${name}> tag`,
        fix: `Add <${name}> tag`,
      })
    }
  }

  // Check 3: Has charset
  if (!html.includes('charset=')) {
    warnings.push('Missing charset declaration in <head>')
  }

  // Check 4: Has viewport
  if (!html.includes('viewport')) {
    warnings.push('Missing viewport meta tag for responsive design')
  }

  // Check 5: Check for unclosed tags
  const unclosedTags = findUnclosedTags(html)
  for (const tag of unclosedTags) {
    errors.push({
      type: 'unclosed_tag',
      message: `Unclosed <${tag}> tag`,
      fix: `Add </${tag}> closing tag`,
    })
  }

  // Check 6: Validate basic structure
  const structureIssues = validateStructure(html)
  errors.push(...structureIssues)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Find unclosed HTML tags
 */
function findUnclosedTags(html: string): string[] {
  const unclosed: string[] = []
  
  // Self-closing tags
  const selfClosing = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]

  // Track tag counts
  const tagCounts: Record<string, number> = {}

  // Find opening tags
  const openingTags = html.matchAll(/<([a-z][a-z0-9]*)[^>]*>/gi)
  for (const match of openingTags) {
    const tagName = match[1].toLowerCase()
    if (!selfClosing.includes(tagName) && !match[0].endsWith('/>')) {
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1
    }
  }

  // Find closing tags
  const closingTags = html.matchAll(/<\/([a-z][a-z0-9]*)>/gi)
  for (const match of closingTags) {
    const tagName = match[1].toLowerCase()
    tagCounts[tagName] = (tagCounts[tagName] || 0) - 1
  }

  // Check for unclosed
  for (const [tag, count] of Object.entries(tagCounts)) {
    if (count > 0) {
      unclosed.push(tag)
    }
  }

  return unclosed
}

/**
 * Validate HTML structure order
 */
function validateStructure(html: string): HTMLValidationError[] {
  const errors: HTMLValidationError[] = []

  const htmlIndex = html.indexOf('<html')
  const headIndex = html.indexOf('<head>')
  const bodyIndex = html.indexOf('<body>')

  if (htmlIndex !== -1 && headIndex !== -1 && htmlIndex > headIndex) {
    errors.push({
      type: 'invalid_structure',
      message: '<html> tag must come before <head>',
    })
  }

  if (headIndex !== -1 && bodyIndex !== -1 && headIndex > bodyIndex) {
    errors.push({
      type: 'invalid_structure',
      message: '<head> tag must come before <body>',
    })
  }

  return errors
}

/**
 * Auto-fix common HTML issues
 */
export function autoFixHTML(html: string, errors: HTMLValidationError[]): string {
  let fixed = html

  for (const error of errors) {
    switch (error.type) {
      case 'missing_tag':
        fixed = fixMissingTag(fixed, error.message)
        break
      
      case 'unclosed_tag':
        fixed = fixUnclosedTag(fixed, error.message)
        break
      
      case 'invalid_structure':
        fixed = fixStructure(fixed)
        break
    }
  }

  return fixed
}

/**
 * Fix missing tags
 */
function fixMissingTag(html: string, errorMessage: string): string {
  let fixed = html

  // Add DOCTYPE
  if (errorMessage.includes('DOCTYPE')) {
    if (!fixed.trim().startsWith('<!DOCTYPE html>')) {
      fixed = '<!DOCTYPE html>\n' + fixed
    }
  }

  // Add <html> wrapper
  if (errorMessage.includes('html') && !errorMessage.includes('DOCTYPE')) {
    if (!fixed.includes('<html')) {
      const doctype = fixed.match(/<!DOCTYPE html>\n?/i)?.[0] || ''
      const content = fixed.replace(/<!DOCTYPE html>\n?/i, '')
      fixed = doctype + '<html lang="en">\n' + content + '\n</html>'
    }
  }

  // Add <head>
  if (errorMessage.includes('head')) {
    const htmlOpenMatch = fixed.match(/<html[^>]*>/i)
    if (htmlOpenMatch && !fixed.includes('<head>')) {
      const insertPoint = htmlOpenMatch.index! + htmlOpenMatch[0].length
      const head = `
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
</head>`
      fixed = fixed.slice(0, insertPoint) + head + fixed.slice(insertPoint)
    }
  }

  // Add <body>
  if (errorMessage.includes('body')) {
    if (!fixed.includes('<body>')) {
      const headEndMatch = fixed.match(/<\/head>/i)
      const htmlEndMatch = fixed.match(/<\/html>/i)
      
      if (headEndMatch && htmlEndMatch) {
        const contentStart = headEndMatch.index! + headEndMatch[0].length
        const contentEnd = htmlEndMatch.index!
        const content = fixed.substring(contentStart, contentEnd).trim()
        
        fixed = fixed.substring(0, contentStart) +
                '\n<body>\n' + content + '\n</body>\n' +
                fixed.substring(contentEnd)
      }
    }
  }

  return fixed
}

/**
 * Fix unclosed tags
 */
function fixUnclosedTag(html: string, errorMessage: string): string {
  const tagMatch = errorMessage.match(/<([a-z]+)>/)
  if (!tagMatch) return html

  const tagName = tagMatch[1]
  
  // Find the last occurrence of the opening tag
  const regex = new RegExp(`<${tagName}[^>]*>`, 'gi')
  const matches = Array.from(html.matchAll(regex))
  
  if (matches.length === 0) return html

  // Add closing tag before </html> or at the end
  const htmlEnd = html.lastIndexOf('</html>')
  const bodyEnd = html.lastIndexOf('</body>')
  
  const insertPoint = bodyEnd !== -1 ? bodyEnd : (htmlEnd !== -1 ? htmlEnd : html.length)
  
  return html.slice(0, insertPoint) + `</${tagName}>\n` + html.slice(insertPoint)
}

/**
 * Fix structure issues
 */
function fixStructure(html: string): string {
  // Extract content
  const doctype = html.match(/<!DOCTYPE html>/i)?.[0] || '<!DOCTYPE html>'
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || 'My App'
  const headContent = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || ''
  const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html

  // Rebuild with correct structure
  return `${doctype}
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${headContent}
</head>
<body>
  ${bodyContent}
</body>
</html>`
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: HTMLValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return '✅ HTML is valid'
  }

  let output = ''

  if (result.errors.length > 0) {
    output += `🔴 Errors (${result.errors.length}):\n`
    result.errors.forEach((error, i) => {
      output += `  ${i + 1}. ${error.message}`
      if (error.fix) {
        output += ` → ${error.fix}`
      }
      output += '\n'
    })
  }

  if (result.warnings.length > 0) {
    output += `\n⚠️  Warnings (${result.warnings.length}):\n`
    result.warnings.forEach((warning, i) => {
      output += `  ${i + 1}. ${warning}\n`
    })
  }

  return output.trim()
}

/**
 * Extract and parse CSS from HTML
 */
export function extractCSS(html: string): string {
  const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  const cssBlocks: string[] = []

  for (const match of styleMatches) {
    cssBlocks.push(match[1].trim())
  }

  return cssBlocks.join('\n\n')
}

/**
 * Extract and parse JavaScript from HTML
 */
export function extractJavaScript(html: string): string {
  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
  const jsBlocks: string[] = []

  for (const match of scriptMatches) {
    // Skip external scripts
    const scriptTag = match[0]
    if (!scriptTag.includes('src=')) {
      jsBlocks.push(match[1].trim())
    }
  }

  return jsBlocks.join('\n\n')
}
