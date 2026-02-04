// Example usage of extractInlineStyles utility
import { extractInlineStyles } from '../utils/extractInlineStyles';

// Suppose this is your AI-generated HTML
const generatedHtml = `
  <div style="color: red; font-weight: bold;">Hello</div>
  <span style="color: red; font-weight: bold;">World</span>
  <p style="margin: 10px;">Paragraph</p>
`;

// Extract inline styles and get new HTML and CSS
const { html: processedHtml, css: extractedCss } = extractInlineStyles(generatedHtml);

console.log('Processed HTML:', processedHtml);
console.log('Extracted CSS:', extractedCss);

// You can now inject processedHtml and extractedCss into your preview or output
// For example, add <style>{extractedCss}</style> to your document head
