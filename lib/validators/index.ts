// lib/validators/index.ts
// Central export point for all validators

// ============================================================================
// CODE VALIDATOR (Enterprise validation for generated code)
// ============================================================================
// lib/validators/index.ts
export { default as CodeValidator } from './code-validator'
export type { ValidationMessage, ValidationResult } from './code-validator'

// ============================================================================
// HTML VALIDATOR (Quick structural validation)
// ============================================================================
export {
  validateHTMLStructure,
  validateHTMLQuick
} from './html-validator'
export type { HTMLValidationResult } from './html-validator'

// ============================================================================
// USER INPUT VALIDATOR (Password, email, username validation)
// ============================================================================
export {
  validatePassword,
  validateEmail,
  validateUsername,
  sanitizeInput,
  sanitizeHTML
} from './user-input-validator'
export type { PasswordValidationResult } from './user-input-validator'

// Add this export for function-based validation
export { default as validateHTML } from './code-validator';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Comprehensive code validation
import { CodeValidator } from '@/lib/validators'

const validator = new CodeValidator()
const results = validator.validateAll(html, css, js)

if (results.passed) {
  console.log('Code is valid!')
} else {
  console.log('Errors:', results.errors)
}

// Example 2: Quick HTML structure check
import { validateHTMLStructure } from '@/lib/validators'

const quickCheck = validateHTMLStructure(html, false)
if (!quickCheck.isValid) {
  console.log('Issues:', quickCheck.issues)
}

// Example 3: User input validation
import { validatePassword, validateEmail } from '@/lib/validators'

const pwdResult = validatePassword('MyPassword123')
const emailResult = validateEmail('user@example.com')

if (pwdResult.valid && emailResult.valid) {
  // Create account
}
*/


