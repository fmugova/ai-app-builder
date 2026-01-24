#!/usr/bin/env node
// scripts/test-critical-files.ts
// Tests the most critical files in BuildFlow for proper params migration

import { readFileSync, existsSync } from 'fs'

const criticalFiles = [
  // Most used routes with nested params
  'app/api/projects/[id]/route.ts',
  'app/api/projects/[id]/pages/[pageId]/route.ts',
  'app/api/projects/[id]/endpoints/[endpointId]/route.ts',
  'app/api/projects/[id]/domains/[domainId]/route.ts',
  'app/api/projects/[id]/env-vars/[varId]/route.ts',
  
  // Database operations
  'app/api/database/connections/[id]/route.ts',
  'app/api/database/connections/[id]/test/route.ts',
  
  // Workspace management
  'app/api/workspaces/[id]/route.ts',
  'app/api/workspaces/[id]/members/[memberId]/route.ts',
  
  // Admin routes
  'app/api/admin/users/[id]/route.ts',
  'app/api/admin/campaigns/[id]/route.ts',
  
  // Critical pages
  'app/dashboard/projects/[id]/page.tsx',
  'app/dashboard/projects/[id]/pages/[pageId]/edit/page.tsx',
  'app/dashboard/database/[connectionId]/page.tsx',
  'app/projects/[id]/page.tsx',
  'app/preview/[id]/page.tsx',
]

interface TestResult {
  file: string
  exists: boolean
  hasPromiseType: boolean
  hasAwait: boolean
  multipleHttpMethods: string[]
  hasAllMethodsAwait: boolean
  hasSearchParams: boolean
  hasAsyncSearchParams: boolean
  issues: string[]
  status: 'pass' | 'fail' | 'warning'
}

function testFile(filePath: string): TestResult {
  const result: TestResult = {
    file: filePath,
    exists: false,
    hasPromiseType: false,
    hasAwait: false,
    multipleHttpMethods: [],
    hasAllMethodsAwait: true,
    hasSearchParams: false,
    hasAsyncSearchParams: false,
    issues: [],
    status: 'pass'
  }

  if (!existsSync(filePath)) {
    result.issues.push('File does not exist')
    result.status = 'fail'
    return result
  }

  result.exists = true
  const content = readFileSync(filePath, 'utf-8')

  // Check for Promise type
  result.hasPromiseType = /params:\s*Promise</.test(content)

  // Check for await
  result.hasAwait = /await\s+(context\.)?params/.test(content)

  // Check HTTP methods and their await usage
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  methods.forEach(method => {
    const methodRegex = new RegExp(`export async function ${method}`)
    if (methodRegex.test(content)) {
      result.multipleHttpMethods.push(method)
      // Check if this method awaits params
      const methodContent = content.split(`export async function ${method}`)[1]?.split('export async function')[0] || ''
      if (methodContent.includes('params') && !methodContent.includes('await')) {
        result.hasAllMethodsAwait = false
        result.issues.push(`${method} method doesn't await params`)
      }
    }
  })

  // Check for searchParams and Promise usage
  if (content.includes('searchParams')) {
    result.hasSearchParams = true
    result.hasAsyncSearchParams = /searchParams:\s*Promise</.test(content)
    if (!result.hasAsyncSearchParams) {
      result.issues.push('searchParams should also be Promise<>')
    }
  }

  // Direct params access without await
  if (/context\.params\.\w+/.test(content) && !result.hasAwait) {
    result.issues.push('Direct params.* access without await')
  }

  // Missing Promise type but has params
  if (content.includes('params') && !result.hasPromiseType && content.includes('context: {')) {
    result.issues.push('params missing Promise<> wrapper in type')
  }

  // Determine status
  if (result.issues.length > 0) {
    result.status = result.issues.some(i =>
      i.includes('without await') || i.includes('missing Promise')
    ) ? 'fail' : 'warning'
  }

  return result
}

console.log('🧪 Testing Critical BuildFlow Files\n')
console.log('=' .repeat(80))
console.log()

const results = criticalFiles.map(testFile)
const passed = results.filter(r => r.status === 'pass').length
const warnings = results.filter(r => r.status === 'warning').length
const failed = results.filter(r => r.status === 'fail').length

// Display results
results.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
  console.log(`${icon} ${result.file}`)
  
  if (result.status !== 'pass') {
    result.issues.forEach(issue => {
      console.log(`   └─ ${issue}`)
    })
  }
  
  if (result.multipleHttpMethods.length > 1) {
    console.log(`   ℹ️  Multiple methods: ${result.multipleHttpMethods.join(', ')}`)
  }
  
  console.log()
})

console.log('=' .repeat(80))
console.log()
console.log('📊 Summary:')
console.log(`   ✅ Passed: ${passed}/${criticalFiles.length}`)
console.log(`   ⚠️  Warnings: ${warnings}/${criticalFiles.length}`)
console.log(`   ❌ Failed: ${failed}/${criticalFiles.length}`)
console.log()

if (failed > 0) {
  console.log('❌ CRITICAL: Some files have issues that will break the build!')
  console.log('   Review the failed files above and fix the issues.')
  console.log()
  process.exit(1)
} else if (warnings > 0) {
  console.log('⚠️  Some files have warnings. Review them to ensure correctness.')
  console.log()
  process.exit(0)
} else {
  console.log('✅ All critical files look good!')
  console.log()
  console.log('Next steps:')
  console.log('  1. Run: npm run type-check')
  console.log('  2. Run: npm run build')
  console.log('  3. Test your routes manually')
  console.log()
  process.exit(0)
}
