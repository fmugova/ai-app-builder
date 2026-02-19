/**
 * Multi-Page Parser
 * 
 * Extracts multiple pages from AI-generated HTML that contains page delimiters.
 * Supports two formats:
 * 1. HTML comments: <!-- PAGE: slug -->content<!-- /PAGE -->
 * 2. DIV sections: <div id="page-slug" class="page">content</div>
 */

export interface ParsedPage {
  slug: string
  title: string
  content: string
  description?: string
  metaTitle?: string
  metaDescription?: string
  isHomepage: boolean
  order: number
}

export interface MultiPageParseResult {
  isMultiPage: boolean
  pages: ParsedPage[]
  sharedHTML?: string // Header, navigation, footer that appears on all pages
  sharedCSS?: string
  sharedJS?: string
  error?: string
}

/**
 * Detects the type of page structure:
 * - SINGLE_FILE_SPA: Multiple pages/sections in one HTML file (e.g., <!-- PAGE: about -->)
 * - MULTI_FILE: Separate HTML files with inter-page links (e.g., <a href="about.html">)
 * - SINGLE_PAGE: Just one page, no multi-page structure
 */
export type PageStructureType = 'SINGLE_FILE_SPA' | 'MULTI_FILE' | 'SINGLE_PAGE'

export interface PageStructureDetection {
  type: PageStructureType
  confidence: 'high' | 'medium' | 'low'
  indicators: string[]
}

/**
 * Detects if HTML contains multiple pages (backwards compatible)
 */
export function detectMultiPage(html: string): boolean {
  const detection = detectPageStructure(html)
  return detection.type === 'SINGLE_FILE_SPA' || detection.type === 'MULTI_FILE'
}

/**
 * Detects the page structure type with confidence level
 */
export function detectPageStructure(html: string): PageStructureDetection {
  const indicators: string[] = []
  
  // Check for single-file SPA indicators
  const hasPageComments = /<!-- PAGE: [\w-]+ -->/i.test(html)
  const hasPageDivs = /<div[^>]*id="page-[\w-]+"[^>]*class="[^"]*page[^"]*"/i.test(html)
  const hasShowPageFunction = /function\s+showPage\s*\(/i.test(html)
  const hasHiddenClass = /class="[^"]*\bhidden\b[^"]*"/i.test(html)
  const multiplePageDivs = (html.match(/<div[^>]*class="[^"]*page[^"]*"/g) || []).length > 1
  
  // Check for multi-file project indicators
  const hasHtmlFileLinks = /<a[^>]*href="[\w-]+\.html"[^>]*>/gi.test(html)
  const hasMultipleHtmlTags = (html.match(/<html[^>]*>/gi) || []).length > 1
  const hasFileComments = /##\s*[\w-]+\.html/i.test(html) || /<!-- File:\s*[\w.-]+\.html\s*-->/i.test(html)
  
  // Single-file SPA detection
  if (hasPageComments || (hasPageDivs && hasShowPageFunction)) {
    indicators.push('Page comment delimiters found')
    if (hasPageDivs) indicators.push('Page div structure found')
    if (hasShowPageFunction) indicators.push('Page navigation function found')
    return {
      type: 'SINGLE_FILE_SPA',
      confidence: 'high',
      indicators
    }
  }
  
  // Multi-file project detection
  if (hasHtmlFileLinks || hasMultipleHtmlTags || hasFileComments) {
    if (hasHtmlFileLinks) indicators.push('Links to .html files found')
    if (hasMultipleHtmlTags) indicators.push('Multiple complete HTML documents found')
    if (hasFileComments) indicators.push('File name comments found')
    return {
      type: 'MULTI_FILE',
      confidence: 'high',
      indicators
    }
  }
  
  // Heuristic detection for ambiguous cases
  if (multiplePageDivs && hasHiddenClass) {
    indicators.push('Multiple page divs with hidden class')
    return {
      type: 'SINGLE_FILE_SPA',
      confidence: 'medium',
      indicators
    }
  }
  
  // Default to single page
  indicators.push('No multi-page structure detected')
  return {
    type: 'SINGLE_PAGE',
    confidence: 'high',
    indicators
  }
}

/**
 * Extracts pages using HTML comment delimiters
 * Format: <!-- PAGE: about -->...<!-- /PAGE -->
 */
function extractCommentPages(html: string): ParsedPage[] {
  const pagePattern = /<!-- PAGE: ([\w-]+) -->([\s\S]*?)<!-- \/PAGE -->/gi
  const pages: ParsedPage[] = []
  let match
  let order = 0

  while ((match = pagePattern.exec(html)) !== null) {
    const [, slug, content] = match
    const page = parsePageContent(slug, content, order)
    pages.push(page)
    order++
  }

  return pages
}

/**
 * Extracts pages using div sections with class="page"
 * Format: <div id="page-about" class="page">...</div>
 */
function extractDivPages(html: string): ParsedPage[] {
  const pagePattern = /<div[^>]*id="page-([\w-]+)"[^>]*class="[^"]*page[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  const pages: ParsedPage[] = []
  let match
  let order = 0

  while ((match = pagePattern.exec(html)) !== null) {
    const [, slug, content] = match
    const page = parsePageContent(slug, content, order)
    pages.push(page)
    order++
  }

  // If no pages found with id="page-X", try generic class="page"
  if (pages.length === 0) {
    const genericPattern = /<div[^>]*class="[^"]*page[^"]*"[^>]*data-page="([\w-]+)"[^>]*>([\s\S]*?)<\/div>/gi
    let genericMatch
    
    while ((genericMatch = genericPattern.exec(html)) !== null) {
      const [, slug, content] = genericMatch
      const page = parsePageContent(slug, content, order)
      pages.push(page)
      order++
    }
  }

  return pages
}

/**
 * Parse content of a single page to extract metadata
 */
function parsePageContent(slug: string, content: string, order: number): ParsedPage {
  // Extract title from h1 or h2
  const titleMatch = content.match(/<h[12][^>]*>(.*?)<\/h[12]>/i)
  const title = titleMatch ? stripHTML(titleMatch[1]) : slugToTitle(slug)

  // Extract description from <!-- DESC: ... --> or first paragraph
  const descMatch = content.match(/<!-- DESC: (.*?) -->/i)
  const description = descMatch
    ? descMatch[1]
    : extractFirstParagraph(content)

  // Extract meta title from <!-- META_TITLE: ... -->
  const metaTitleMatch = content.match(/<!-- META_TITLE: (.*?) -->/i)
  const metaTitle = metaTitleMatch ? metaTitleMatch[1] : title

  // Extract meta description from <!-- META_DESC: ... -->
  const metaDescMatch = content.match(/<!-- META_DESC: (.*?) -->/i)
  const metaDescription = metaDescMatch ? metaDescMatch[1] : description

  // Homepage is usually "home", "index", or order=0
  const isHomepage = slug === 'home' || slug === 'index' || order === 0

  return {
    slug,
    title,
    content: cleanPageContent(content),
    description,
    metaTitle,
    metaDescription,
    isHomepage,
    order,
  }
}

/**
 * Extract multiple HTML files from <!-- File: name.html --> delimiter format
 * (format used by BUILDFLOW_ENHANCED_SYSTEM_PROMPT)
 */
function extractFileCommentPages(content: string): ParsedPage[] {
  // Match <!-- File: name.html --> ... up to next delimiter or end
  const filePattern = /<!-- File:\s*([\w.-][\w.-]*\.html)\s*-->([\s\S]*?)(?=<!-- File:|$)/gi
  const pages: ParsedPage[] = []
  let match
  let order = 0

  while ((match = filePattern.exec(content)) !== null) {
    const [, filename, htmlContent] = match
    const trimmed = htmlContent.trim()
    if (!trimmed) continue
    const slug = filename.replace(/\.html$/, '')

    const titleTagMatch = trimmed.match(/<title>(.*?)<\/title>/i)
    const h1Match = trimmed.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const title = titleTagMatch
      ? stripHTML(titleTagMatch[1]).split(' - ')[0]
      : h1Match
      ? stripHTML(h1Match[1])
      : slugToTitle(slug)

    const metaDescMatch = trimmed.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
    const metaDescription = metaDescMatch ? metaDescMatch[1] : extractFirstParagraph(trimmed)

    pages.push({
      slug,
      title,
      content: trimmed,
      description: metaDescription,
      metaTitle: titleTagMatch ? stripHTML(titleTagMatch[1]) : title,
      metaDescription,
      isHomepage: slug === 'index' || order === 0,
      order,
    })
    order++
  }

  return pages
}

/**
 * Extract multiple HTML files from ## filename.html format
 */
function extractMultipleFiles(content: string): ParsedPage[] {
  // Allow hyphens and dots in filenames ([\w-]+)
  const filePattern = /##\s*([\w-]+\.html)\s*\n([\s\S]*?)(?=##\s*[\w-]+\.html|$)/gi
  const pages: ParsedPage[] = []
  let match
  let order = 0

  while ((match = filePattern.exec(content)) !== null) {
    const [, filename, htmlContent] = match
    const slug = filename.replace('.html', '')
    
    // Extract title from title tag or h1
    const titleTagMatch = htmlContent.match(/<title>(.*?)<\/title>/i)
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const title = titleTagMatch ? stripHTML(titleTagMatch[1]).split(' - ')[0] : 
                  h1Match ? stripHTML(h1Match[1]) : 
                  slugToTitle(slug)
    
    // Extract meta description
    const metaDescMatch = htmlContent.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
    const metaDescription = metaDescMatch ? metaDescMatch[1] : extractFirstParagraph(htmlContent)
    
    const page: ParsedPage = {
      slug,
      title,
      content: htmlContent.trim(),
      description: metaDescription,
      metaTitle: titleTagMatch ? stripHTML(titleTagMatch[1]) : title,
      metaDescription,
      isHomepage: slug === 'index' || order === 0,
      order,
    }
    
    pages.push(page)
    order++
  }

  return pages
}

/**
 * Clean page content by removing metadata comments
 */
function cleanPageContent(content: string): string {
  return content
    .replace(/<!-- META_TITLE: .*? -->/gi, '')
    .replace(/<!-- META_DESC: .*? -->/gi, '')
    .replace(/<!-- DESC: .*? -->/gi, '')
    .trim()
}

/**
 * Extract shared HTML (navigation, header, footer)
 */
function extractSharedHTML(html: string): string {
  // Extract content before first page
  const beforePages = html.split(/<!-- PAGE:|<div[^>]*id="page-/i)[0]
  
  // Extract navigation sections
  const navMatch = beforePages.match(/<nav[\s\S]*?<\/nav>/i)
  const headerMatch = beforePages.match(/<header[\s\S]*?<\/header>/i)
  
  const shared = [
    headerMatch ? headerMatch[0] : '',
    navMatch ? navMatch[0] : '',
  ].filter(Boolean).join('\n')

  return shared
}

/**
 * Extract shared CSS styles
 */
function extractSharedCSS(html: string): string {
  const styleMatches = html.match(/<style>([\s\S]*?)<\/style>/gi)
  return styleMatches ? styleMatches.join('\n') : ''
}

/**
 * Extract shared JavaScript
 */
function extractSharedJS(html: string): string {
  const scriptMatches = html.match(/<script(?![^>]*src=)([\s\S]*?)<\/script>/gi)
  
  if (!scriptMatches) return ''

  // Filter out page-specific scripts, keep global ones
  return scriptMatches
    .filter(script => {
      const content = script.toLowerCase()
      return (
        content.includes('showpage') ||
        content.includes('router') ||
        content.includes('navigation') ||
        content.includes('appstate') ||
        content.includes('addeventlistener')
      )
    })
    .join('\n')
}

/**
 * Main parser function with auto-detection
 */
export function parseMultiPageHTML(html: string): MultiPageParseResult {
  try {
    const detection = detectPageStructure(html)
    
    if (detection.type === 'SINGLE_PAGE') {
      return {
        isMultiPage: false,
        pages: [],
      }
    }

    let pages: ParsedPage[] = []
    
    // Parse based on detected structure type
    if (detection.type === 'MULTI_FILE') {
      // Try <!-- File: name.html --> format first (used by BUILDFLOW_ENHANCED_SYSTEM_PROMPT)
      pages = extractFileCommentPages(html)

      // Fallback: ## filename.html format
      if (pages.length === 0) {
        pages = extractMultipleFiles(html)
      }
      // Fallback: <!-- PAGE: slug --> format
      if (pages.length === 0) {
        pages = extractCommentPages(html)
      }
      if (pages.length === 0) {
        pages = extractDivPages(html)
      }
    } else {
      // SINGLE_FILE_SPA - extract pages from delimited sections
      pages = extractCommentPages(html)
      
      if (pages.length === 0) {
        pages = extractDivPages(html)
      }
    }

    // If still no pages found, return error
    if (pages.length === 0) {
      return {
        isMultiPage: false,
        pages: [],
        error: `Detected ${detection.type} structure but could not extract pages. Indicators: ${detection.indicators.join(', ')}`,
      }
    }

    // Extract shared components (only for SINGLE_FILE_SPA)
    let sharedHTML = ''
    let sharedCSS = ''
    let sharedJS = ''
    
    if (detection.type === 'SINGLE_FILE_SPA') {
      sharedHTML = extractSharedHTML(html)
      sharedCSS = extractSharedCSS(html)
      sharedJS = extractSharedJS(html)
    }
    // For MULTI_FILE, each page is complete - no shared extraction needed

    return {
      isMultiPage: true,
      pages,
      sharedHTML,
      sharedCSS,
      sharedJS,
    }
  } catch (error) {
    return {
      isMultiPage: false,
      pages: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    }
  }
}

/**
 * Helper: Convert slug to title case
 */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Helper: Strip HTML tags from string
 */
function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Helper: Extract first paragraph for description
 */
function extractFirstParagraph(content: string): string {
  const pMatch = content.match(/<p[^>]*>(.*?)<\/p>/i)
  if (!pMatch) return ''
  
  const text = stripHTML(pMatch[1])
  return text.length > 160 ? text.substring(0, 157) + '...' : text
}

/**
 * Analyzes user prompt to determine if they want single-file SPA or multi-file project
 */
export function detectUserIntent(prompt: string): {
  wantsSingleFile: boolean
  confidence: 'high' | 'medium' | 'low'
  keywords: string[]
} {
  const lowerPrompt = prompt.toLowerCase()
  const keywords: string[] = []
  
  // Strong indicators for single-file SPA
  const singleFileKeywords = [
    'on one html file',
    'in one file',
    'single file',
    'single html',
    'all in one',
    'one page app',
    'spa with',
    'single page application',
    'not separate files',
    'not as separate',
    'don\'t split',
    'keep in one',
  ]
  
  // Strong indicators for multi-file
  const multiFileKeywords = [
    'separate files',
    'separate html',
    'multiple files',
    'different files',
    'individual files',
    'as separate pages',
    'create separate',
  ]
  
  // Check for single-file indicators
  const singleFileMatches = singleFileKeywords.filter(keyword => {
    if (lowerPrompt.includes(keyword)) {
      keywords.push(keyword)
      return true
    }
    return false
  })
  
  // Check for multi-file indicators
  const multiFileMatches = multiFileKeywords.filter(keyword => {
    if (lowerPrompt.includes(keyword)) {
      keywords.push(keyword)
      return true
    }
    return false
  })
  
  // Determine intent and confidence
  if (singleFileMatches.length > 0 && multiFileMatches.length === 0) {
    return {
      wantsSingleFile: true,
      confidence: 'high',
      keywords
    }
  }
  
  if (multiFileMatches.length > 0 && singleFileMatches.length === 0) {
    return {
      wantsSingleFile: false,
      confidence: 'high',
      keywords
    }
  }
  
  if (singleFileMatches.length > multiFileMatches.length) {
    return {
      wantsSingleFile: true,
      confidence: 'medium',
      keywords
    }
  }
  
  if (multiFileMatches.length > singleFileMatches.length) {
    return {
      wantsSingleFile: false,
      confidence: 'medium',
      keywords
    }
  }
  
  // Default: assume single-file SPA (most common for simple projects)
  return {
    wantsSingleFile: true,
    confidence: 'low',
    keywords: ['default assumption']
  }
}

/**
 * Validate parsed pages
 */
export function validatePages(pages: ParsedPage[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (pages.length === 0) {
    errors.push('No pages found')
  }

  if (pages.length > 50) {
    errors.push('Too many pages (max 50)')
  }

  const slugs = new Set<string>()
  pages.forEach((page, index) => {
    if (!page.slug || !page.slug.match(/^[a-z0-9-]+$/)) {
      errors.push(`Invalid slug at page ${index}: ${page.slug}`)
    }

    if (slugs.has(page.slug)) {
      errors.push(`Duplicate slug: ${page.slug}`)
    }
    slugs.add(page.slug)

    if (!page.title || page.title.length > 200) {
      errors.push(`Invalid title at page ${index}`)
    }

    if (page.content.length > 1000000) {
      errors.push(`Content too large at page ${index} (max 1MB)`)
    }
  })

  const homepages = pages.filter(p => p.isHomepage)
  if (homepages.length === 0) {
    errors.push('No homepage defined')
  }
  if (homepages.length > 1) {
    errors.push('Multiple homepages defined')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
