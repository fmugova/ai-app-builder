/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 */

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  missing: string[]
  placeholders: string[]
}

// Critical environment variables required for app to function
const CRITICAL_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'ANTHROPIC_API_KEY',
] as const

// Important environment variables (app runs but features may be limited)
const IMPORTANT_ENV_VARS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const

// Optional environment variables
const OPTIONAL_ENV_VARS = [
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'VERCEL_API_TOKEN',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
  'CRON_SECRET',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// Patterns that indicate placeholder values
const PLACEHOLDER_PATTERNS = [
  /your-.*-here/i,
  /sk-ant-api03-your-key-here/i,
  /generate-with/i,
  /your-key/i,
  /xxx/i,
  /placeholder/i,
  /changeme/i,
  /example/i,
]

/**
 * Validate a single environment variable
 */
function validateEnvVar(name: string, value: string | undefined): {
  valid: boolean
  error?: string
  warning?: string
  isPlaceholder?: boolean
} {
  // Check if missing
  if (!value || value.trim() === '') {
    return {
      valid: false,
      error: `${name} is not set`,
    }
  }

  // Check if placeholder
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(value)) {
      return {
        valid: false,
        isPlaceholder: true,
        error: `${name} contains a placeholder value: "${value.substring(0, 50)}..."`,
      }
    }
  }

  // Specific validations
  if (name === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
    return {
      valid: false,
      error: `${name} must be a valid PostgreSQL connection string`,
    }
  }

  if (name === 'NEXTAUTH_URL' && !value.startsWith('http')) {
    return {
      valid: false,
      error: `${name} must be a valid URL starting with http:// or https://`,
    }
  }

  if (name === 'NEXTAUTH_SECRET' && value.length < 32) {
    return {
      valid: false,
      warning: `${name} should be at least 32 characters for security`,
    }
  }

  if (name === 'ANTHROPIC_API_KEY' && !value.startsWith('sk-ant-')) {
    return {
      valid: false,
      error: `${name} must be a valid Anthropic API key (starts with sk-ant-)`,
    }
  }

  if (name === 'UPSTASH_REDIS_REST_URL' && !value.startsWith('https://')) {
    return {
      valid: false,
      error: `${name} must be a valid HTTPS URL`,
    }
  }

  return { valid: true }
}

/**
 * Validate all environment variables
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const missing: string[] = []
  const placeholders: string[] = []

  // Validate critical variables
  for (const varName of CRITICAL_ENV_VARS) {
    const value = process.env[varName]
    const result = validateEnvVar(varName, value)

    if (!result.valid) {
      if (result.isPlaceholder) {
        placeholders.push(varName)
      }
      errors.push(result.error || `${varName} validation failed`)
      if (!value) {
        missing.push(varName)
      }
    }
    if (result.warning) {
      warnings.push(result.warning)
    }
  }

  // Validate important variables (warnings only)
  for (const varName of IMPORTANT_ENV_VARS) {
    const value = process.env[varName]
    const result = validateEnvVar(varName, value)

    if (!result.valid) {
      if (result.isPlaceholder) {
        placeholders.push(varName)
      }
      if (!value) {
        warnings.push(`${varName} is not set - some features may be limited`)
      } else {
        warnings.push(result.error || `${varName} may be misconfigured`)
      }
    }
    if (result.warning) {
      warnings.push(result.warning)
    }
  }

  // Check production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    // In production, Redis is required for rate limiting
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      errors.push('Redis configuration is required in production for rate limiting')
    }

    // Stripe should be configured in production
    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push('Stripe is not configured - payment features will not work')
    }

    // Sentry for error tracking
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      warnings.push('Sentry is not configured - error tracking will not work')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
    placeholders,
  }
}

/**
 * Log validation results in a human-readable format
 */
export function logValidationResults(result: EnvValidationResult): void {
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment variables validated successfully')
    return
  }

  console.log('\n' + '='.repeat(80))
  console.log('🔍 ENVIRONMENT VARIABLE VALIDATION')
  console.log('='.repeat(80) + '\n')

  if (result.errors.length > 0) {
    console.error('❌ ERRORS (must be fixed):')
    result.errors.forEach((error) => console.error(`   - ${error}`))
    console.log('')
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  WARNINGS (recommended to fix):')
    result.warnings.forEach((warning) => console.warn(`   - ${warning}`))
    console.log('')
  }

  if (result.placeholders.length > 0) {
    console.error('🔧 PLACEHOLDER VALUES DETECTED:')
    console.error('   The following variables contain placeholder values:')
    result.placeholders.forEach((varName) => console.error(`   - ${varName}`))
    console.error('   Replace them with actual values in your .env file')
    console.log('')
  }

  if (result.missing.length > 0) {
    console.error('❓ MISSING REQUIRED VARIABLES:')
    result.missing.forEach((varName) => console.error(`   - ${varName}`))
    console.error('   Add these to your .env file (see .env.example)')
    console.log('')
  }

  console.log('='.repeat(80))

  if (!result.valid) {
    console.log('')
    console.error('💡 QUICK FIX:')
    console.error('   1. Copy .env.example to .env.local')
    console.error('   2. Replace all placeholder values with real values')
    console.error('   3. Restart your development server')
    console.log('')
    console.log('='.repeat(80) + '\n')
  }
}

/**
 * Validate environment or throw error (for startup checks)
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironmentVariables()
  logValidationResults(result)

  if (!result.valid) {
    throw new Error(
      `Environment validation failed with ${result.errors.length} error(s). ` +
        'Fix the errors above before starting the application.'
    )
  }
}

/**
 * Get environment status summary for health checks
 */
export function getEnvironmentStatus(): {
  configured: string[]
  missing: string[]
  optional: string[]
} {
  const configured: string[] = []
  const missing: string[] = []
  const optional: string[] = []

  // Check all environment variables
  const allVars = [
    ...CRITICAL_ENV_VARS,
    ...IMPORTANT_ENV_VARS,
    ...OPTIONAL_ENV_VARS,
  ] as const

  for (const varName of allVars) {
    const value = process.env[varName]
    const isConfigured = value && value.trim() !== ''

    if (isConfigured) {
      // Check if it's a placeholder
      const isPlaceholder = PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))
      if (isPlaceholder) {
        missing.push(varName)
      } else {
        configured.push(varName)
      }
    } else {
      if (OPTIONAL_ENV_VARS.includes(varName as any)) {
        optional.push(varName)
      } else {
        missing.push(varName)
      }
    }
  }

  return { configured, missing, optional }
}

// Export for use in health check endpoint
export const envConfig = {
  validate: validateEnvironmentVariables,
  log: logValidationResults,
  validateOrThrow: validateEnvironmentOrThrow,
  getStatus: getEnvironmentStatus,
}
