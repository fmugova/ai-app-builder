export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  isTruncated: boolean;
}

export function validateGeneratedCode(code: string, allowPartial = false): ValidationResult {
  const issues: string[] = [];
  
  // Basic structure checks
  if (!code.includes('<!DOCTYPE html>') && !allowPartial) {
    issues.push('Missing DOCTYPE declaration');
  }
  
  if (!code.includes('</html>') && !allowPartial) {
    issues.push('Incomplete HTML - missing closing tag');
  }
  
  // Check for truncation indicators
  const truncationSignals = [
    /\.\.\.$/, // Ends with ...
    /\/\*[^*]*$/, // Unclosed CSS comment
    /<!--[^>]*$/, // Unclosed HTML comment
    /<style[^>]*>[^<]*$/, // Unclosed style tag
    /<script[^>]*>[^<]*$/, // Unclosed script tag
  ];
  
  for (const pattern of truncationSignals) {
    if (pattern.test(code.trim())) {
      issues.push('Code appears to be truncated');
      break;
    }
  }
  
  // Count opening vs closing tags
  const openingTags = (code.match(/<(?!\/)[a-z][^>]*>/gi) || []).length;
  const closingTags = (code.match(/<\/[a-z][^>]*>/gi) || []).length;
  
  if (Math.abs(openingTags - closingTags) > 5 && !allowPartial) {
    issues.push(`Mismatched tags: ${openingTags} opening, ${closingTags} closing`);
  }
  
  return {
    isValid: issues.length === 0 || allowPartial,
    issues,
    isTruncated: issues.some(i => i.includes('truncated'))
  };
}
// Password validation utilities

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  // Optional: require special character
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('Password must contain at least one special character')
  // }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Sanitize user input (basic XSS prevention)
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}
