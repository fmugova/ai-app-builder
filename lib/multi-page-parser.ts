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
 * Detects if HTML contains multiple pages
 */
export function detectMultiPage(html: string): boolean {
  const hasPageComments = /<!-- PAGE: [\w-]+ -->/i.test(html)
  const hasPageDivs = /<div[^>]*id="page-[\w-]+"[^>]*class="[^"]*page[^"]*"/i.test(html)
  const hasMultiplePageDivs = (html.match(/<div[^>]*class="[^"]*page[^"]*"/g) || []).length > 1
  
  return hasPageComments || hasPageDivs || hasMultiplePageDivs
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
 * Main parser function
 */
export function parseMultiPageHTML(html: string): MultiPageParseResult {
  try {
    if (!detectMultiPage(html)) {
      return {
        isMultiPage: false,
        pages: [],
      }
    }

    // Try extracting with comment delimiters first
    let pages = extractCommentPages(html)

    // If no comment pages, try div sections
    if (pages.length === 0) {
      pages = extractDivPages(html)
    }

    // If still no pages found, return error
    if (pages.length === 0) {
      return {
        isMultiPage: false,
        pages: [],
        error: 'Detected multi-page structure but could not extract pages',
      }
    }

    // Extract shared components
    const sharedHTML = extractSharedHTML(html)
    const sharedCSS = extractSharedCSS(html)
    const sharedJS = extractSharedJS(html)

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
