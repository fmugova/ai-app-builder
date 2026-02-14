// lib/api-code-validator.ts
// Enhanced code quality validation with TypeScript syntax checking

interface ValidationIssue {
  severity: 'error' | 'warning'
  message: string
  line?: number
}

interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  score: number // 0-100
}

/**
 * Comprehensive code validation before showing generated API code to users
 * Checks for best practices, common mistakes, and TypeScript syntax errors
 */
export async function validateAPICode(code: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []

  // Check 1: Has database client (Prisma) when database access is used
  const hasDatabaseCall = code.includes('prisma.') || code.includes("from '@prisma/client'")
  const claimsDbAccess = code.includes('database') || code.includes('db.') || code.includes('findMany') || code.includes('findFirst') || code.includes('findUnique')
  if (claimsDbAccess && !hasDatabaseCall) {
    issues.push({
      severity: 'warning',
      message: 'Database access detected but no Prisma client found. Import prisma from @/lib/prisma.',
    })
  }

  // Check 2: Has proper error handling
  const hasTryCatch = code.includes('try') && code.includes('catch')
  if (!hasTryCatch) {
    issues.push({
      severity: 'error',
      message: 'Missing try-catch block. All API routes should handle errors gracefully.',
    })
  }

  // Check 3: Has input validation
  const hasValidation = code.includes('zod') || code.includes('z.object') || code.includes('.parse(')
  if (!hasValidation) {
    issues.push({
      severity: 'warning',
      message: 'No input validation detected. Consider using Zod for request validation.',
    })
  }

  // Check 4: Returns proper NextResponse
  const hasNextResponse = code.includes('NextResponse.json(')
  if (!hasNextResponse) {
    issues.push({
      severity: 'error',
      message: 'Missing NextResponse.json() return. API routes must return a NextResponse.',
    })
  }

  // Check 5: Has proper HTTP status codes
  const hasStatusCodes = /status:\s*\d{3}/.test(code)
  if (!hasStatusCodes) {
    issues.push({
      severity: 'warning',
      message: 'No HTTP status codes found. Consider using appropriate status codes (200, 201, 400, 404, 500).',
    })
  }

  // Check 6: Has required imports
  const requiredImports = {
    NextRequest: code.includes('NextRequest'),
    NextResponse: code.includes('NextResponse'),
  }

  if (!requiredImports.NextRequest && code.includes('request: ')) {
    issues.push({
      severity: 'error',
      message: 'Missing NextRequest import from "next/server".',
    })
  }

  if (!requiredImports.NextResponse) {
    issues.push({
      severity: 'error',
      message: 'Missing NextResponse import from "next/server".',
    })
  }

  // Check 7: Has authentication check (if requiresAuth is in code context)
  const hasAuth = code.includes('getServerSession') || code.includes('session')
  const mightNeedAuth = code.includes('user') || code.includes('userId')
  
  if (mightNeedAuth && !hasAuth) {
    issues.push({
      severity: 'warning',
      message: 'Possible authentication required but no session check found. Consider using getServerSession().',
    })
  }

  // Check 8: Has TypeScript types
  const hasTypes = /:\s*(string|number|boolean|any|unknown)/.test(code) || code.includes('interface ') || code.includes('type ')
  if (!hasTypes) {
    issues.push({
      severity: 'warning',
      message: 'No TypeScript type annotations found. Add types for better code quality.',
    })
  }

  // Check 9: Has proper async/await
  const hasAsync = code.includes('async') && code.includes('await')
  const hasDbCallForAsync = code.includes('.from(') || code.includes('prisma.') || code.includes('supabase.')
  
  if (hasDbCallForAsync && !hasAsync) {
    issues.push({
      severity: 'error',
      message: 'Database calls require async/await. Make sure the handler is async.',
    })
  }

  // Check 10: No console.log in production code
  if (code.includes('console.log(')) {
    issues.push({
      severity: 'warning',
      message: 'Found console.log() statements. Remove or replace with proper logging in production.',
    })
  }

  // Check 11: No hardcoded secrets or credentials
  const dangerousPatterns = [
    /password\s*=\s*['"][^'"]+['"]/i,
    /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
    /secret\s*=\s*['"][^'"]+['"]/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      issues.push({
        severity: 'error',
        message: 'Detected hardcoded credentials. Use environment variables instead.',
      })
      break
    }
  }

  // Check 12: Has proper CORS headers (if needed)
  const hasCORS = code.includes('Access-Control-Allow')
  const mightNeedCORS = code.includes('POST') || code.includes('PUT') || code.includes('DELETE')
  
  if (mightNeedCORS && !hasCORS && !code.includes('withCORS')) {
    issues.push({
      severity: 'warning',
      message: 'Consider adding CORS headers for cross-origin requests.',
    })
  }

  // Check 13: TypeScript syntax validation using esbuild
  try {
    // Dynamic import to avoid bundling issues
    const esbuild = await import('esbuild')
    
    await esbuild.build({
      stdin: {
        contents: code,
        loader: 'ts',
        resolveDir: process.cwd(),
      },
      write: false,
      bundle: false,
      target: 'es2020',
      format: 'esm',
      logLevel: 'silent',
    })
  } catch (error: unknown) {
    // Parse esbuild errors
    const err = error as { errors?: Array<{ text: string; location?: { line: number } }> }
    if (err.errors && err.errors.length > 0) {
      for (const buildError of err.errors) {
        issues.push({
          severity: 'error',
          message: `TypeScript error: ${buildError.text}`,
          line: buildError.location?.line,
        })
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      issues.push({
        severity: 'error',
        message: `TypeScript compilation failed: ${errorMessage}`,
      })
    }
  }

  // Calculate quality score
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  
  let score = 100
  score -= errorCount * 15 // Each error costs 15 points
  score -= warningCount * 5 // Each warning costs 5 points
  score = Math.max(0, score)

  const isValid = errorCount === 0 && score >= 60

  return {
    isValid,
    issues,
    score,
  }
}

/**
 * Quick validation for testing (without esbuild)
 */
export function validateAPICodeQuick(code: string): ValidationResult {
  const issues: ValidationIssue[] = []

  // Basic checks without TypeScript compilation
  const checks = [
    { pattern: /try\s*\{[\s\S]*catch/, message: 'Missing try-catch error handling', severity: 'error' as const },
    { pattern: /NextResponse\.json\(/, message: 'Missing NextResponse.json()', severity: 'error' as const },
    { pattern: /from\s+['"]next\/server['"]/, message: 'Missing imports from "next/server"', severity: 'error' as const },
    { pattern: /status:\s*\d{3}/, message: 'No HTTP status codes defined', severity: 'warning' as const },
    { pattern: /createClient|supabase/, message: 'No Supabase client usage', severity: 'warning' as const },
  ]

  for (const check of checks) {
    if (!check.pattern.test(code)) {
      issues.push({ severity: check.severity, message: check.message })
    }
  }

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  
  let score = 100
  score -= errorCount * 20
  score -= warningCount * 10
  score = Math.max(0, score)

  return {
    isValid: errorCount === 0,
    issues,
    score,
  }
}

/**
 * Format validation issues for display
 */
export function formatValidationIssues(result: ValidationResult): string {
  if (result.isValid && result.issues.length === 0) {
    return '✅ Code quality: Excellent (100/100)'
  }

  let output = `Code Quality Score: ${result.score}/100\n\n`

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')

  if (errors.length > 0) {
    output += `🔴 Errors (${errors.length}):\n`
    errors.forEach((issue, i) => {
      output += `  ${i + 1}. ${issue.message}`
      if (issue.line) output += ` (line ${issue.line})`
      output += '\n'
    })
    output += '\n'
  }

  if (warnings.length > 0) {
    output += `⚠️  Warnings (${warnings.length}):\n`
    warnings.forEach((issue, i) => {
      output += `  ${i + 1}. ${issue.message}`
      if (issue.line) output += ` (line ${issue.line})`
      output += '\n'
    })
  }

  return output.trim()
}

/**
 * Get suggestions for fixing validation issues
 */
export function getFixSuggestions(result: ValidationResult): string[] {
  const suggestions: string[] = []

  for (const issue of result.issues) {
    if (issue.message.includes('try-catch')) {
      suggestions.push('Wrap your database operations in a try-catch block to handle errors')
    }
    if (issue.message.includes('NextResponse')) {
      suggestions.push('Import NextResponse from "next/server" and return NextResponse.json()')
    }
    if (issue.message.includes('input validation')) {
      suggestions.push('Add Zod schema validation: const schema = z.object({ ... }); schema.parse(data)')
    }
    if (issue.message.includes('status codes')) {
      suggestions.push('Use proper HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Error)')
    }
    if (issue.message.includes('authentication')) {
      suggestions.push('Add authentication: const session = await getServerSession(authOptions)')
    }
    if (issue.message.includes('TypeScript')) {
      suggestions.push('Fix TypeScript syntax errors before proceeding')
    }
    if (issue.message.includes('hardcoded credentials')) {
      suggestions.push('Move credentials to environment variables: process.env.API_KEY')
    }
  }

  return [...new Set(suggestions)] // Remove duplicates
}
