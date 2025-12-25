export function sanitizeCode(input: string): string {
  // Remove iframe tags
  let result = input.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  
  // Remove script tags with malicious sources (but keep whitelisted CDNs)
  result = result.replace(/<script\s+src="(?!https:\/\/cdn\.tailwindcss\.com)[^"]*"[^>]*>.*?<\/script>/gi, '');
  // Remove inline scripts and script tags without src or with empty src
  result = result.replace(/<script(?!\s+src="https:\/\/cdn\.tailwindcss\.com)[^>]*>.*?<\/script>/gi, '');
  
  // Remove inline event handlers
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return result;
}

export function isCodeSafe(input: string): boolean {
  // Check for unsafe patterns
  if (/<iframe/i.test(input)) return false;
  if (/<script\s+src="(?!https:\/\/cdn\.tailwindcss\.com)/i.test(input)) return false;
  if (/on\w+\s*=/i.test(input)) return false;
  
  return true;
}