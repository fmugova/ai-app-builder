/**
 * Sanitize code for iframe preview
 * For complete HTML documents, return as-is (they already have everything)
 * For code fragments, wrap with React infrastructure
 */
export function sanitizeForPreview(code: string): string {
  const trimmed = code.trim();
  
  // Check if this is a complete HTML document
  const isCompleteHTML = 
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    (trimmed.includes('<head>') && trimmed.includes('<body>'));
  
  if (isCompleteHTML) {
    console.log('✅ Complete HTML detected - returning as-is');
    // Return complete HTML documents UNCHANGED - no modifications!
    return trimmed;
  }
  
  console.log('⚠️ Code fragment detected - wrapping with React infrastructure');
  
  // For fragments, wrap with minimal React infrastructure
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${trimmed}
  </script>
</body>
</html>`;
}

/**
 * Check if code is safe (for security)
 */
export function isCodeSafe(code: string): boolean {
  const dangerous = [
    /<script[^>]*src=["'](?!https:\/\/(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.tailwindcss\.com))/i,
    /javascript:/i,
    /<iframe(?![^>]*srcdoc)/i
  ];
  
  return !dangerous.some(pattern => pattern.test(code));
}