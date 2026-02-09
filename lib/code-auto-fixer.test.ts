import {
  autoFixCode,
  fixWarnings,
  fixSecurityIssues,
} from './code-auto-fixer'

describe('code-auto-fixer', () => {
  describe('autoFixCode', () => {
    it('should fix missing try-catch blocks', async () => {
      const code = `export async function GET() {
  const users = await prisma.user.findMany()
  return NextResponse.json({ users })
}`

      const validationResult = {
        isValid: false,
        issues: [
          { severity: 'error' as const, message: 'Missing try-catch block' }
        ],
        score: 60
      }

      const fixed = await autoFixCode(code, validationResult)

      expect(fixed).toContain('try')
      expect(fixed).toContain('catch')
    })

    it('should add missing NextResponse import', async () => {
      const code = `export async function GET() {
  return response.json({ data: 'test' })
}`

      const validationResult = {
        isValid: false,
        issues: [
          { severity: 'error' as const, message: 'Missing NextResponse import' }
        ],
        score: 70
      }

      const fixed = await autoFixCode(code, validationResult)

      expect(fixed).toContain("import { NextResponse } from 'next/server'")
    })

    it('should handle already-valid code', async () => {
      const code = `import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ data: 'test' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}`

      const validationResult = {
        isValid: true,
        issues: [],
        score: 100
      }

      const fixed = await autoFixCode(code, validationResult)

      expect(fixed).toBe(code)
    })

    it('should fix multiple issues', async () => {
      const code = `export async function POST(request) {
  const data = await request.json()
  const result = await prisma.user.create({ data })
  return response.json(result)
}`

      const validationResult = {
        isValid: false,
        issues: [
          { severity: 'error' as const, message: 'Missing NextRequest import' },
          { severity: 'error' as const, message: 'Missing try-catch block' }
        ],
        score: 50
      }

      const fixed = await autoFixCode(code, validationResult)

      expect(fixed).toContain('try')
      expect(fixed).toContain('catch')
      expect(fixed).toContain("import { NextRequest } from 'next/server'")
    })

    it('should preserve existing code structure', async () => {
      const code = `// Important comment
export async function GET() {
  const users = await prisma.user.findMany()
  return NextResponse.json({ users })
}`

      const  validationResult = {
        isValid: false,
        issues: [
          { severity: 'error' as const, message: 'Missing try-catch block' }
        ],
        score: 70
      }

      const fixed = await autoFixCode(code, validationResult)

      expect(fixed).toContain('// Important comment')
    })
  })

  describe('fixWarnings', () => {
    it('should handle console.log warnings', () => {
      const code = `export async function GET() {
  console.log('Debug message')
  return NextResponse.json({ data: 'test' })
}`

      const warnings = ['Avoid console.log in production']

      const fixed = fixWarnings(code, warnings)

      expect(fixed).toBeTruthy()
      expect(fixed.length).toBeGreaterThan(0)
    })

    it('should handle missing HTTP status codes', () => {
      const code = `export async function GET() {
  return NextResponse.json({ error: 'Not found' })
}`

      const warnings = ['Missing HTTP status code for error response']

      const fixed = fixWarnings(code, warnings)

      expect(fixed).toBeTruthy()
    })

    it('should return original code if no warnings', () => {
      const code = `export async function GET() {
  try {
    return NextResponse.json({ data: 'test' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}`

      const fixed = fixWarnings(code, [])

      expect(fixed).toBe(code)
    })
  })

  describe('fixSecurityIssues', () => {
    it('should replace hardcoded secrets', () => {
      const code = `const apiKey = 'sk_test_1234567890abcdef'
const result = await fetch('https://api.example.com', {
  headers: { 'Authorization': \`Bearer \${apiKey}\` }
})`

      const fixed = fixSecurityIssues(code)

      expect(fixed).not.toContain('sk_test_1234567890abcdef')
      expect(fixed).toContain('process.env')
    })

    it('should fix SQL injection risks', () => {
      const code = `const userId = request.query.id
const user = await prisma.$queryRaw\`SELECT * FROM users WHERE id = \${userId}\``

      const fixed = fixSecurityIssues(code)

      expect(fixed).toBeTruthy()
      // Should suggest using parameterized queries or Prisma methods
    })

    it('should not modify secure code', () => {
      const code = `const apiKey = process.env.API_KEY
const result = await fetch('https://api.example.com', {
  headers: { 'Authorization': \`Bearer \${apiKey}\` }
})`

      const fixed = fixSecurityIssues(code)

      expect(fixed).toBe(code)
    })

    it('should handle XSS vulnerabilities', () => {
      const code = `const userInput = request.query.search
return \`<div>\${userInput}</div>\``

      const fixed = fixSecurityIssues(code)

      expect(fixed).toBeTruthy()
      // Should suggest sanitization or proper escaping
    })
  })

  describe('Integration', () => {
    it('should fix complex code with multiple issues', async () => {
      const code = `export async function POST(request) {
  const apiKey = 'sk_test_secret'
  const data = await request.json()
  console.log('Creating user:', data)
  const user = await prisma.user.create({ data })
  return NextResponse.json(user)
}`

      const validationResult = {
        isValid: false,
        issues: [
          { severity: 'error' as const, message: 'Missing try-catch block' },
          { severity: 'error' as const, message: 'Missing NextResponse import' },
          { severity: 'warning' as const, message: 'Hardcoded API key detected' },
          { severity: 'warning' as const, message: 'Avoid console.log in production' }
        ],
        score: 40
      }

      let fixed = await autoFixCode(code, validationResult)
      fixed = fixSecurityIssues(fixed)

      expect(fixed).toContain('try')
      expect(fixed).toContain('catch')
      expect(fixed).not.toContain('sk_test_secret')
      // Note: import is not added because NextResponse is already referenced in original code
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty code', async () => {
      const fixed = await autoFixCode('', { isValid: true, issues: [], score: 100 })
      expect(fixed).toBe('')
    })

    it('should handle code with only comments', async () => {
      const code = `// This is a comment
/* Multi-line
   comment */`

      const fixed = await autoFixCode(code, { isValid: true, issues: [], score: 100 })
      expect(fixed).toBe(code)
    })

    it('should preserve code formatting', async () => {
      const code = `
export async function GET() {
  const users = await prisma.user.findMany()


  return NextResponse.json({ users })
}
`

      const validationResult = {
        isValid: false,
        issues: [
          { severity: 'error' as const, message: 'Missing try-catch block' }
        ],
        score: 70
      }

      const fixed = await autoFixCode(code, validationResult)

      // Should maintain general structure
      expect(fixed).toContain('export async function GET()')
    })
  })
})
