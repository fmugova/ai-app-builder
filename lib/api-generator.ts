// lib/api-generator.ts
// AI-powered API endpoint code generation

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

**Guidelines:**
1. Use Next.js 14+ App Router syntax (app/api/...)
2. Include proper error handling
3. Add input validation
4. Use TypeScript
5. Include helpful comments
6. Handle edge cases
7. Return proper status codes
8. Use Prisma for database operations
9. Use NextAuth for authentication
10. Follow REST best practices

**Code Structure:**
- Import statements first
- Type definitions if needed
- Main handler function
- Error handling with try-catch
- Proper HTTP status codes
- JSON responses

**Return ONLY the TypeScript code, no explanations.**

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

  // Build database info
  let databaseInfo = ''
  if (usesDatabase && databaseTable) {
    databaseInfo = `- Database Table: ${databaseTable}
- Include Prisma queries`
  }

  // Replace placeholders in prompt
  const prompt = ENDPOINT_GENERATION_PROMPT
    .replace('{description}', description)
    .replace('{method}', method)
    .replace('{path}', path)
    .replace('{requiresAuth}', requiresAuth.toString())
    .replace('{usesDatabase}', usesDatabase.toString())
    .replace('{databaseInfo}', databaseInfo)

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
    const cleanCode = code
      .replace(/^```typescript\n/, '')
      .replace(/^```ts\n/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim()

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

  // Check for required imports
  if (!code.includes('NextResponse')) {
    errors.push('Missing NextResponse import')
  }

  // Check for export
  if (!code.includes('export async function')) {
    errors.push('Missing exported function')
  }

  // Check for try-catch
  if (!code.includes('try') || !code.includes('catch')) {
    warnings.push('Missing error handling (try-catch)')
  }

  // Check for status codes
  if (!code.includes('status:')) {
    warnings.push('No explicit status codes found')
  }

  // Check for validation
  if (code.includes('POST') || code.includes('PUT')) {
    if (!code.includes('validation') && !code.includes('if (!')) {
      warnings.push('Consider adding input validation')
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
