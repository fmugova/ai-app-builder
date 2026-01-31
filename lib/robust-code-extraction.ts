/**
 * ROBUST CODE EXTRACTION
 * Handles multiple formats from Claude API
 */

/**
 * Extract code blocks from Claude's response
 * Handles multiple formats:
 * 1. Markdown code blocks (```html, ```css, ```js)
 * 2. Plain HTML (complete documents)
 * 3. Mixed formats
 */
export function extractCodeBlocks(text: string): { html: string; css: string; js: string } {
  let html = '';
  const css = '';
  const js = '';

  // Try markdown first
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/i);
  if (htmlMatch) html = htmlMatch[1].trim();

  // Fallback: Find <!DOCTYPE
  if (!html && text.includes('<!DOCTYPE')) {
    const docMatch = text.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i);
    if (docMatch) html = docMatch[0].trim();
  }

  // Fallback: Find <html> tag
  if (!html && text.includes('<html')) {
    const htmlTagMatch = text.match(/<html[\s\S]*?<\/html>/i);
    if (htmlTagMatch) html = htmlTagMatch[0].trim();
  }

  // Optionally, add CSS/JS extraction if needed (not in quick fix)

  console.log('Extracted:', { 
    htmlLength: html.length,
    cssLength: css.length,
    jsLength: js.length 
  });

  return { html, css, js };
}

/**
 * Alternative: Extract from specific format
 */
export function extractFromAlternativeFormat(text: string): { html: string; css: string; js: string } {
  const result = {
    html: '',
    css: '',
    js: '',
  };

  // Try to find sections marked by headers
  const htmlSection = text.match(/#{1,3}\s*HTML[\s\S]*?```(html)?\n([\s\S]*?)```/i);
  const cssSection = text.match(/#{1,3}\s*CSS[\s\S]*?```(css)?\n([\s\S]*?)```/i);
  const jsSection = text.match(/#{1,3}\s*(?:JavaScript|JS)[\s\S]*?```(js|javascript)?\n([\s\S]*?)```/i);

  if (htmlSection) result.html = htmlSection[2].trim();
  if (cssSection) result.css = cssSection[2].trim();
  if (jsSection) result.js = jsSection[2].trim();

  return result;
}

/**
 * Test the extraction with sample input
 */
export function testExtraction(text: string): void {
  console.log('🧪 Testing extraction...');
  console.log('Input length:', text.length);
  
  const result = extractCodeBlocks(text);
  
  console.log('Results:', {
    html: result.html.length > 0 ? `${result.html.length} chars` : 'EMPTY',
    css: result.css.length > 0 ? `${result.css.length} chars` : 'EMPTY',
    js: result.js.length > 0 ? `${result.js.length} chars` : 'EMPTY',
  });
  
  if (result.html) {
    console.log('HTML preview:', result.html.substring(0, 100));
  }
}
