// lib/api-generator.ts
// AI-powered API endpoint code generation

import { validateAPICode, formatValidationIssues } from './api-code-validator'
import { autoFixCode, fixWarnings, fixSecurityIssues } from './code-auto-fixer'
import { smartGenerate } from './template-based-generator'

interface GenerateEndpointParams {
  description: string
  method?: string
  path?: string
  requiresAuth?: boolean
  usesDatabase?: boolean
  databaseTable?: string
  responseType?: 'json' | 'html' | 'text'
}

// AI Prompt for endpoint generation
const ENDPOINT_GENERATION_PROMPT = `You are an expert Next.js API route developer. Generate a production-ready API endpoint based on the user's requirements.

**Requirements:**
{description}

**Technical Specs:**
- Method: {method}
- Path: {path}
- Requires Auth: {requiresAuth}
- Uses Database: {usesDatabase}
{databaseInfo}

**CRITICAL - You MUST include ALL of these imports:**
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server'
{authImports}
{databaseImports}
{validationImports}
\`\`\`

**Guidelines:**
1. Use Next.js 14+ App Router syntax (app/api/...)
2. ALWAYS wrap the entire function in try-catch
3. Add comprehensive input validation with Zod
4. Use TypeScript with proper types
5. Include helpful comments
6. Handle ALL edge cases
7. Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
8. Use Prisma for database operations with error handling
9. Use NextAuth for authentication if required
10. Follow REST best practices
11. Add rate limiting for state-changing operations
12. Sanitize all user inputs

**Code Structure:**
- Import statements first (REQUIRED)
- Type definitions and Zod schemas
- Main async handler function with proper types
- Comprehensive try-catch with specific error handling
- Input validation before processing
- Database operations with error handling
- Proper HTTP status codes for all scenarios
- JSON responses with consistent structure

**Error Handling Pattern:**
\`\`\`typescript
try {
  // Authentication check
  // Input validation
  // Business logic
  // Database operations
  // Success response
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: 'Error message', details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  )
}
\`\`\`

**Return ONLY the complete TypeScript code with ALL imports, no explanations.**

Generate the complete API route code:`

export async function generateApiEndpoint(
  params: GenerateEndpointParams
): Promise<{ code: string; path: string; method: string }> {
  const {
    description,
    method = 'GET',
    path = '/api/endpoint',
    requiresAuth = false,
    usesDatabase = false,
    databaseTable
  } = params

  // ENHANCED: Use template-first approach for simple APIs (prevents token limits)
  const isSimpleAPI = description.length < 300 && 
                      !description.includes('complex') && 
                      !description.includes('multiple') &&
                      (method === 'GET' || method === 'POST' || method === 'PUT' || method === 'DELETE')

  if (isSimpleAPI && usesDatabase) {
    try {
      console.log('📋 Using template-first generation to prevent token limits...')
      const result = await smartGenerate(description, {
        description,
        method,
        tableName: databaseTable,
        requiresAuth,
        usesDatabase,
      })
      
      return {
        code: result.code,
        path: result.path,
        method: result.method,
      }
    } catch (error) {
      console.warn('Template generation failed, falling back to full AI generation:', error)
      // Fall through to full AI generation
    }
  }

  // Original full AI generation for complex cases
  // Build required imports based on configuration
  let authImports = ''
  if (requiresAuth) {
    authImports = `import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'`
  }

  let databaseImports = ''
  if (usesDatabase) {
    databaseImports = `import { prisma } from '@/lib/prisma'`
  }

  const validationImports = `import { z } from 'zod'`

  // Build database info
  let databaseInfo = ''
  if (usesDatabase && databaseTable) {
    databaseInfo = `- Database Table: ${databaseTable}
- Include Prisma queries with proper error handling
- Use transactions for multiple operations`
  }

  // Replace placeholders in prompt
  const prompt = ENDPOINT_GENERATION_PROMPT
    .replace('{description}', description)
    .replace('{method}', method)
    .replace('{path}', path)
    .replace('{requiresAuth}', requiresAuth.toString())
    .replace('{usesDatabase}', usesDatabase.toString())
    .replace('{databaseInfo}', databaseInfo)
    .replace('{authImports}', authImports)
    .replace('{databaseImports}', databaseImports)
    .replace('{validationImports}', validationImports)

  try {
    // Call Claude API (Anthropic)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const code = data.content[0].text

    // Clean up code (remove markdown fences if present)
    let cleanCode = code
      .replace(/^```typescript\n/, '')
      .replace(/^```ts\n/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim()

    // ENHANCED: Validate and auto-fix code quality
    try {
      let validationResult = await validateAPICode(cleanCode)
      
      if (!validationResult.isValid) {
        console.warn('Generated code has quality issues:', formatValidationIssues(validationResult))
        
        // Auto-fix if score is low
        if (validationResult.score < 80) {
          console.log('🔧 Attempting auto-fix...')
          cleanCode = await autoFixCode(cleanCode, validationResult)
          cleanCode = fixWarnings(cleanCode, validationResult.issues.filter(i => i.severity === 'warning').map(i => i.message))
          cleanCode = fixSecurityIssues(cleanCode)
          
          // Re-validate after fixes
          validationResult = await validateAPICode(cleanCode)
          console.log(`✅ After auto-fix: ${validationResult.score}/100`)
        }
        
        // If still too low after auto-fix, throw error
        if (validationResult.score < 60) {
          throw new Error(
            `Generated code quality too low (${validationResult.score}/100) even after auto-fix. Issues:\n${formatValidationIssues(validationResult)}`
          )
        }
      }
      
      console.log(`✅ Code validation passed with score: ${validationResult.score}/100`)
    } catch (validationError) {
      console.error('Code validation error:', validationError)
      // Re-throw only if it's a quality issue
      if (validationError instanceof Error && validationError.message.includes('quality too low')) {
        throw validationError
      }
    }

    return {
      code: cleanCode,
      path,
      method
    }
  } catch (error: unknown) {
    console.error('AI generation error:', error)
    throw new Error('Failed to generate API endpoint')
  }
}

// ============================================================================
// TEMPLATE-BASED GENERATION (Fallback if AI fails)
// ============================================================================

export function generateFromTemplate(
  templateId: string,
  variables: Record<string, string>
): string {
  // TODO: Import template from api-templates.ts using templateId
  const template = getTemplateById()
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  // Replace variables
  let code = template.code
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    code = code.replace(regex, value)
  }

  return code
}

function getTemplateById(): { code: string } | null {
  // This would import from api-templates.ts
  // For now, return null (implement when integrating)
  return null
}

// ============================================================================
// CODE VALIDATION
// ============================================================================

export function validateGeneratedCode(code: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // CRITICAL: Check for required imports
  if (!code.includes('NextResponse') || !code.includes('NextRequest')) {
    errors.push('Missing NextRequest/NextResponse imports from next/server')
  }

  // Check for Zod import
  if (!code.includes("from 'zod'") && !code.includes('from "zod"')) {
    warnings.push('Consider adding Zod for input validation')
  }

  // Check for export
  if (!code.includes('export async function')) {
    errors.push('Missing exported async function handler')
  }

  // CRITICAL: Check for try-catch error handling
  if (!code.includes('try') || !code.includes('catch')) {
    errors.push('Missing try-catch error handling - REQUIRED for production')
  }

  // Check for proper error logging
  if (code.includes('catch') && !code.includes('console.error')) {
    warnings.push('Add error logging in catch block for debugging')
  }

  // Check for status codes
  if (!code.includes('status:')) {
    errors.push('Missing explicit HTTP status codes in responses')
  }

  // Check that all error responses have status codes
  if (code.includes('NextResponse.json') && code.includes('error')) {
    const errorResponsesWithoutStatus = !code.includes('status: 400') && 
                                       !code.includes('status: 401') && 
                                       !code.includes('status: 500')
    if (errorResponsesWithoutStatus) {
      warnings.push('Ensure all error responses have appropriate status codes')
    }
  }

  // Check for input validation on POST/PUT/PATCH
  if (code.includes('POST') || code.includes('PUT') || code.includes('PATCH')) {
    if (!code.includes('parse') && !code.includes('validation') && !code.includes('if (!')) {
      warnings.push('Add input validation for POST/PUT/PATCH requests using Zod')
    }
  }

  // Check for authentication implementation
  if (code.includes('getServerSession')) {
    if (!code.includes('authOptions')) {
      errors.push('Missing authOptions import when using getServerSession')
    }
    if (!code.includes('401')) {
      warnings.push('Add 401 Unauthorized response for unauthenticated requests')
    }
  }

  // Check for database error handling
  if (code.includes('prisma')) {
    if (!code.includes('@/lib/prisma')) {
      errors.push('Missing prisma import from @/lib/prisma')
    }
    // Check for database error handling
    const hasDatabaseErrorHandling = code.includes('PrismaClientKnownRequestError') || 
                                     code.includes('catch') && code.includes('prisma')
    if (!hasDatabaseErrorHandling) {
      warnings.push('Add specific error handling for database operations')
    }
  }

  // Check for TypeScript types
  if (!code.includes('interface') && !code.includes('type ') && code.length > 200) {
    warnings.push('Consider adding TypeScript interfaces or types for better type safety')
  }

  // Security checks
  if ((code.includes('POST') || code.includes('DELETE') || code.includes('PUT')) && 
      !code.includes('session') && !code.includes('auth')) {
    warnings.push('Consider adding authentication for state-changing operations')
  }

  // Check for consistent error response format
  if (code.includes('error:')) {
    const hasConsistentFormat = code.includes('error:') && code.includes('NextResponse.json')
    if (!hasConsistentFormat) {
      warnings.push('Use consistent error response format: { error: string }')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// AUTO-DOCUMENTATION GENERATION
// ============================================================================

export interface ApiDocumentation {
  method: string
  path: string
  description: string
  authentication: boolean
  requestBody?: {
    type: string
    properties: Record<string, unknown>
  }
  responses: Record<
    string,
    {
      description: string
      example?: unknown
    }
  >
  examples?: {
    request?: string
    response?: string
  }
}

export function generateDocumentation(
  code: string,
  method: string,
  path: string,
  description: string
): ApiDocumentation {
  const doc: ApiDocumentation = {
    method,
    path,
    description,
    authentication: code.includes('getServerSession') || code.includes('auth'),
    responses: {}
  }

  // Extract response status codes
  const statusMatches = code.matchAll(/status:\s*(\d+)/g)
  for (const match of statusMatches) {
    const status = match[1]
    doc.responses[status] = {
      description: getStatusDescription(parseInt(status))
    }
  }

  // Add default 200 if no statuses found
  if (Object.keys(doc.responses).length === 0) {
    doc.responses['200'] = {
      description: 'Success'
    }
  }

  return doc
}

function getStatusDescription(status: number): string {
  const descriptions: Record<number, string> = {
    200: 'Success',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error'
  }
  return descriptions[status] || 'Response'
}

// ============================================================================
// ENDPOINT TESTING
// ============================================================================

export async function testEndpoint(
  url: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{
  success: boolean
  status: number
  data?: unknown
  error?: string
  duration: number
}> {
  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    })

    const duration = Date.now() - startTime
    const data = await response.json().catch(() => null)

    return {
      success: response.ok,
      status: response.status,
      data,
      duration
    }
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    }
  }
}

// ============================================================================
// CODE FORMATTING
// ============================================================================

export function formatCode(code: string): string {
  // Basic formatting (in production, use prettier)
  let formatted = code

  // Remove extra blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  // Ensure consistent indentation
  const lines = formatted.split('\n')
  let indentLevel = 0
  const indentedLines = lines.map(line => {
    const trimmed = line.trim()

    // Decrease indent for closing braces
    if (trimmed.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    const indented = '  '.repeat(indentLevel) + trimmed

    // Increase indent for opening braces
    if (trimmed.endsWith('{') && !trimmed.startsWith('}')) {
      indentLevel++
    }

    return indented
  })

  return indentedLines.join('\n')
}

// ============================================================================
// SMART SUGGESTIONS
// ============================================================================

export function suggestImprovements(code: string): string[] {
  const suggestions: string[] = []

  // Rate limiting
  if (!code.includes('rate') && !code.includes('limit')) {
    suggestions.push('Consider adding rate limiting for security')
  }

  // CSRF protection
  if (
    (code.includes('POST') || code.includes('DELETE') || code.includes('PUT')) &&
    !code.includes('csrf')
  ) {
    suggestions.push('Add CSRF protection for state-changing operations')
  }

  // Logging
  if (!code.includes('console.log') && !code.includes('logger')) {
    suggestions.push('Add logging for debugging and monitoring')
  }

  // Input sanitization
  if (!code.includes('sanitize') && !code.includes('escape')) {
    suggestions.push('Consider sanitizing user inputs to prevent XSS')
  }

  // Database transactions
  if (code.includes('prisma') && code.includes('create') && code.includes('update')) {
    if (!code.includes('transaction')) {
      suggestions.push('Use Prisma transactions for multiple database operations')
    }
  }

  // Caching
  if (code.includes('GET') && code.includes('prisma') && !code.includes('cache')) {
    suggestions.push('Consider adding caching for frequently accessed data')
  }

  return suggestions
}
