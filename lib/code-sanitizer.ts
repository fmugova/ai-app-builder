export function sanitizeReactCode(code: string): string {
  // Remove 'use client' directive for preview
  let sanitized = code.replace(/^['"]use client['"]\s*;?\s*/gm, '');
  
  // Remove 'use server' directive
  sanitized = sanitized.replace(/^['"]use server['"]\s*;?\s*/gm, '');
  
  // Ensure proper JSX syntax
  sanitized = sanitized.trim();
  
  return sanitized;
}

export function prepareCodeForPreview(code: string, type: string): string {
  if (type === 'react' || type === 'nextjs') {
    return sanitizeReactCode(code);
  }
  return code;
}
