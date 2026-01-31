// Basic HTML structure validation (moved from lib/validator.ts)

export interface HTMLValidationResult {
  isValid: boolean
  issues: string[]
  isTruncated: boolean
}

export function validateHTMLStructure(code: string, allowPartial = false): HTMLValidationResult {
  const issues: string[] = []
  
  // Basic structure checks
  if (!code.includes('<!DOCTYPE html>') && !allowPartial) {
    issues.push('Missing DOCTYPE declaration')
  }
  
  if (!code.includes('</html>') && !allowPartial) {
    issues.push('Incomplete HTML - missing closing tag')
  }
  
  // Check for truncation indicators
  const truncationSignals = [
    /\.\.\.$/, // Ends with ...
    /\/\*[^*]*$/, // Unclosed CSS comment
    /<!--[^>]*$/, // Unclosed HTML comment
    /<style[^>]*>[^<]*$/, // Unclosed style tag
    /<script[^>]*>[^<]*$/, // Unclosed script tag
  ]
  
  for (const pattern of truncationSignals) {
    if (pattern.test(code.trim())) {
      issues.push('Code appears to be truncated')
      break
    }
  }
  
  // Count opening vs closing tags
  const openingTags = (code.match(/<(?!\/)[a-z][^>]*>/gi) || []).length
  const closingTags = (code.match(/<\/[a-z][^>]*>/gi) || []).length
  
  if (Math.abs(openingTags - closingTags) > 5 && !allowPartial) {
    issues.push(`Mismatched tags: ${openingTags} opening, ${closingTags} closing`)
  }
  
  return {
    isValid: issues.length === 0 || allowPartial,
    issues,
    isTruncated: issues.some(i => i.includes('truncated'))
  }
}

// Quick validation for streaming (lightweight)
export function validateHTMLQuick(html: string): boolean {
  return html.includes('<!DOCTYPE html>') && 
         html.includes('</html>') && 
         html.includes('<body') &&
         html.includes('</body>')
}
