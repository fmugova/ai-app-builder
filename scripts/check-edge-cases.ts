#!/usr/bin/env node
// scripts/check-edge-cases.ts
// Checks for edge cases in params migration for BuildFlow

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const edgeCasePatterns = [
  // Direct property access on params without await
  /context\.params\.[a-zA-Z0-9_]+(?!\s*=\s*await)/g,
  // params used in string interpolation without await
  /\$\{\s*context\.params\.[a-zA-Z0-9_]+\s*\}/g,
  // params destructured without await
  /const\s*\{[^}]*\}\s*=\s*context\.params/g,
  // searchParams used without Promise type
  /searchParams:\s*[^P][^r][^o][^m][^i][^s][^e]</g,
  // params used in function signature without Promise
  /params:\s*\{[^}]*\}/g,
  // params used in function body without await
  /function\s*\w*\([^)]*params:[^)]*\)[^{]*{[^}]*context\.params\.[a-zA-Z0-9_]+/gs
]

const directories = [
  'app/api',
  'app/dashboard',
  'app/projects',
  'app/preview',
]

const fileExtensions = ['.ts', '.tsx']

import fs from 'fs'

function walk(dir: string, filelist: string[] = []): string[] {
  const files = fs.readdirSync(dir)
  files.forEach((file: string) => {
    const filepath = join(dir, file)
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist)
    } else if (fileExtensions.some(ext => file.endsWith(ext))) {
      filelist.push(filepath)
    }
  })
  return filelist
}

function checkEdgeCases(filePath: string): string[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8')
  const issues: string[] = []
  edgeCasePatterns.forEach((pattern, idx) => {
    if (pattern.test(content)) {
      issues.push(`Pattern ${idx + 1} matched: ${pattern}`)
    }
  })
  return issues
}

console.log('🔎 Checking for Edge Case Param Usages\n')
console.log('=' .repeat(80))
console.log()

let allFiles: string[] = []
directories.forEach(dir => {
  if (existsSync(dir)) {
    allFiles = allFiles.concat(walk(dir))
  }
})

let totalIssues = 0
allFiles.forEach(file => {
  const issues = checkEdgeCases(file)
  if (issues.length > 0) {
    totalIssues += issues.length
    console.log(`❌ ${file}`)
    issues.forEach(issue => {
      console.log(`   └─ ${issue}`)
    })
    console.log()
  }
})

if (totalIssues === 0) {
  console.log('✅ No edge case issues found!')
} else {
  console.log(`❌ Found ${totalIssues} edge case issues. Review the files above.`)
}

console.log('\nDone.')
