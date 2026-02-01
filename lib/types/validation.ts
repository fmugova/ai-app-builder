// lib/types/validation.ts
// Shared validation types for PreviewFrame and ChatBuilder

export interface ValidationError {
  message: string
  line?: number
  column?: number
  severity?: 'error' | 'warning' | 'info'
  [key: string]: unknown  // Index signature for flexibility
}

export interface ValidationResult {
  validationPassed?: boolean
  validationScore?: number
  errors?: ValidationError[]
  warnings?: ValidationError[]
  passed: boolean
  score?: number
}
