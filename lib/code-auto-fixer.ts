// lib/code-auto-fixer.ts
// Auto-fix common code quality issues

interface ValidationIssue {
  severity: 'error' | 'warning'
  message: string
  line?: number
}

interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  score: number
}

/**
 * Attempt to automatically fix validation issues
 */
export async function autoFixCode(code: string, validationResult: ValidationResult): Promise<string> {
  let fixedCode = code

  // Fix each issue based on type
  for (const issue of validationResult.issues) {
    if (issue.severity === 'error') {
      fixedCode = await fixError(fixedCode, issue.message)
    }
  }

  return fixedCode
}

/**
 * Fix specific error types
 */
async function fixError(code: string, errorMessage: string): Promise<string> {
  let fixed = code

  // Fix 1: Missing try-catch
  if (errorMessage.includes('try-catch')) {
    fixed = addTryCatch(fixed)
  }

  // Fix 2: Missing NextResponse import
  if (errorMessage.includes('NextResponse import')) {
    fixed = addNextResponseImport(fixed)
  }

  // Fix 3: Missing NextRequest import
  if (errorMessage.includes('NextRequest import')) {
    fixed = addNextRequestImport(fixed)
  }

  // Fix 4: Missing Zod import
  if (errorMessage.includes('Zod')) {
    fixed = addZodImport(fixed)
  }

  // Fix 5: Missing status codes
  if (errorMessage.includes('HTTP status')) {
    fixed = addStatusCodes(fixed)
  }

  // Fix 6: TypeScript syntax errors
  if (errorMessage.includes('TypeScript error') || errorMessage.includes('compilation failed')) {
    fixed = await fixTypeScriptSyntax(fixed, errorMessage)
  }

  return fixed
}

/**
 * Wrap code in try-catch if missing
 */
function addTryCatch(code: string): string {
  // Check if already has try-catch
  if (code.includes('try') && code.includes('catch')) {
    return code
  }

  // Find the function body
  const functionMatch = code.match(/(export\s+async\s+function\s+\w+\([^)]*\)\s*{)([\s\S]*)(}\s*$)/m)
  
  if (!functionMatch) {
    return code
  }

  const [, functionStart, functionBody, functionEnd] = functionMatch

  // Wrap function body in try-catch
  const wrappedBody = `
  try {${functionBody}
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }`

  return code.replace(functionMatch[0], functionStart + wrappedBody + functionEnd)
}

/**
 * Add NextResponse import
 */
function addNextResponseImport(code: string): string {
  if (code.includes('NextResponse')) {
    return code
  }

  const importMatch = code.match(/^(import\s+{[^}]*})\s+from\s+['"]next\/server['"];?/m)
  
  if (importMatch) {
    // Add to existing import
    const imports = importMatch[1]
    if (!imports.includes('NextResponse')) {
      const newImport = imports.replace('}', ', NextResponse }')
      return code.replace(importMatch[0], `${newImport} from 'next/server'`)
    }
  } else {
    // Add new import at top
    return `import { NextResponse } from 'next/server'\n${code}`
  }

  return code
}

/**
 * Add NextRequest import
 */
function addNextRequestImport(code: string): string {
  if (code.includes('NextRequest')) {
    return code
  }

  const importMatch = code.match(/^(import\s+{[^}]*})\s+from\s+['"]next\/server['"];?/m)
  
  if (importMatch) {
    // Add to existing import
    const imports = importMatch[1]
    if (!imports.includes('NextRequest')) {
      const newImport = imports.replace('}', ', NextRequest }')
      return code.replace(importMatch[0], `${newImport} from 'next/server'`)
    }
  } else {
    // Add new import at top
    return `import { NextRequest } from 'next/server'\n${code}`
  }

  return code
}

/**
 * Add Zod import
 */
function addZodImport(code: string): string {
  if (code.includes("from 'zod'") || code.includes('from "zod"')) {
    return code
  }

  // Add import after next/server import or at top
  const firstImport = code.match(/^import\s+.*$/m)
  if (firstImport) {
    return code.replace(firstImport[0], `${firstImport[0]}\nimport { z } from 'zod'`)
  }

  return `import { z } from 'zod'\n${code}`
}

/**
 * Add proper HTTP status codes
 */
function addStatusCodes(code: string): string {
  let fixed = code

  // Add status to success responses
  fixed = fixed.replace(
    /NextResponse\.json\(\s*{\s*success:\s*true([^}]*)\}\s*\)/g,
    (match, content) => {
      if (!match.includes('status:')) {
        return `NextResponse.json({ success: true${content} }, { status: 200 })`
      }
      return match
    }
  )

  // Add status to error responses in catch blocks
  fixed = fixed.replace(
    /catch[^{]*{[^}]*NextResponse\.json\(\s*{\s*error:/g,
    (match) => {
      if (!match.includes('status:')) {
        return match.replace('NextResponse.json(', 'NextResponse.json(') + ' }, { status: 500 })'
      }
      return match
    }
  )

  return fixed
}

/**
 * Fix TypeScript syntax errors using AI
 */
async function fixTypeScriptSyntax(code: string, errorMessage: string): Promise<string> {
  try {
    // Use Claude to fix syntax errors
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Fix this TypeScript syntax error. Return ONLY the complete fixed code, no explanations or markdown.

Error:
${errorMessage}

Code:
${code}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('AI fix failed:', response.statusText)
      return code
    }

    const data = await response.json()
    const fixedCode = data.content[0].text
      .replace(/^```typescript\n?/, '')
      .replace(/^```ts\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n```$/, '')
      .trim()

    return fixedCode
  } catch (error) {
    console.error('Auto-fix error:', error)
    return code
  }
}

/**
 * Fix common best practice warnings
 */
export function fixWarnings(code: string, warnings: string[]): string {
  let fixed = code

  for (const warning of warnings) {
    // Add input validation suggestion as comment
    if (warning.includes('input validation')) {
      const schemaComment = `
// TODO: Add input validation
// const schema = z.object({
//   // Define your validation schema here
// })
// const validatedData = schema.parse(body)
`
      // Add comment before first await call
      const firstAwait = fixed.indexOf('await')
      if (firstAwait !== -1) {
        fixed = fixed.slice(0, firstAwait) + schemaComment + fixed.slice(firstAwait)
      }
    }

    // Add authentication suggestion as comment
    if (warning.includes('authentication')) {
      const authComment = `
// TODO: Add authentication
// const session = await getServerSession(authOptions)
// if (!session) {
//   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// }
`
      // Add comment at start of function
      const functionBody = fixed.indexOf('{', fixed.indexOf('export async function'))
      if (functionBody !== -1) {
        fixed = fixed.slice(0, functionBody + 1) + authComment + fixed.slice(functionBody + 1)
      }
    }

    // Remove console.log statements
    if (warning.includes('console.log')) {
      fixed = fixed.replace(/console\.log\([^)]*\);?\n?/g, '')
    }
  }

  return fixed
}

/**
 * Security auto-fixes
 */
export function fixSecurityIssues(code: string): string {
  let fixed = code

  // Replace hardcoded secrets with env vars
  fixed = fixed.replace(
    /['"](?:sk_|pk_|secret_|password_|api_key_)[^'"]+['"]/gi,
    "process.env.SECRET_KEY || ''"
  )

  // Add sanitization for innerHTML usage
  if (fixed.includes('innerHTML')) {
    fixed = `import DOMPurify from 'isomorphic-dompurify'\n` + fixed
    fixed = fixed.replace(
      /\.innerHTML\s*=\s*([^;]+)/g,
      '.innerHTML = DOMPurify.sanitize($1)'
    )
  }

  return fixed
}
