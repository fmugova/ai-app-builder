// User input validation (moved from lib/validation.ts)

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  if (!hasLower) errors.push('Password must contain at least one lowercase letter')
  if (!hasUpper) errors.push('Password must contain at least one uppercase letter')
  if (!hasNumber) errors.push('Password must contain at least one number')
  
  // Calculate strength
  const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (password.length >= 12 && criteriaCount >= 4) strength = 'strong'
  else if (password.length >= 10 && criteriaCount >= 3) strength = 'medium'
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  }
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }
  
  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' }
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

export function sanitizeHTML(html: string): string {
  // More aggressive sanitization for user-generated HTML
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' }
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }
  
  if (username.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' }
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
  }
  
  return { valid: true }
}
