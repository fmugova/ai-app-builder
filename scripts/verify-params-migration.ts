#!/usr/bin/env node
// scripts/verify-params-migration.ts
// Checks for common issues after Next.js 15 params migration

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface Issue {
  file: string
  line: number
  issue: string
  snippet: string
  severity: 'error' | 'warning' | 'info'
}

const issues: Issue[] = []

function scanFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  lines.forEach((line, index) => {
    const lineNum = index + 1
    
    // Check 1: Direct access to context.params without await
    if (line.includes('context.params.') && !line.includes('await context.params')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'Direct access to context.params without await',
        snippet: line.trim(),
        severity: 'error'
      })
    }
    
    // Check 2: params destructuring without await
    if (line.match(/const\s*{\s*\w+\s*}\s*=\s*context\.params/) && 
        !line.includes('await')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'Destructuring params without await',
        snippet: line.trim(),
        severity: 'error'
      })
    }
    
    // Check 3: Multiple awaits on the same params (inefficient)
    const awaitParamsCount = (content.match(/await context\.params/g) || []).length
    if (awaitParamsCount > 1) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: `Multiple awaits on context.params (${awaitParamsCount} times) - should await once and reuse`,
        snippet: line.trim(),
        severity: 'warning'
      })
    }
    
    // Check 4: Nested params (e.g., [id] and [pageId])
    if (line.includes('params: Promise<{') && line.includes(',')) {
      const paramNames = line.match(/{\s*([^}]+)\s*}/)?.[1]
      if (paramNames && paramNames.split(',').length > 1) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Multiple dynamic params - verify all are accessed correctly',
          snippet: line.trim(),
          severity: 'info'
        })
      }
    }
    
    // Check 5: params used in props without Promise type
    if (line.match(/{\s*params\s*}:\s*{\s*params:\s*{[^}]+}\s*}/) && 
        !line.includes('Promise')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'params prop type missing Promise wrapper',
        snippet: line.trim(),
        severity: 'error'
      })
    }
    
    // Check 6: searchParams without Promise (also async in Next.js 15)
    if (line.match(/{\s*searchParams\s*}:\s*{\s*searchParams:\s*{[^}]+}\s*}/) && 
        !line.includes('Promise')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'searchParams also needs Promise wrapper in Next.js 15',
        snippet: line.trim(),
        severity: 'error'
      })
    }
    
    // Check 7: Direct params.id access in pages
    if (line.match(/params\.\w+/) && 
        !content.includes('await params') && 
        !line.includes('params: Promise')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'Direct params access - ensure params is awaited first',
        snippet: line.trim(),
        severity: 'warning'
      })
    }
  })
}

function scanDirectory(dir: string) {
  const files = readdirSync(dir)
  
  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(fullPath)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      scanFile(fullPath)
    }
  }
}

console.log('🔍 Scanning for Next.js 15 params migration issues...\n')

scanDirectory('./app')

// Group issues by severity
const errors = issues.filter(i => i.severity === 'error')
const warnings = issues.filter(i => i.severity === 'warning')
const info = issues.filter(i => i.severity === 'info')

if (errors.length > 0) {
  console.log('❌ ERRORS (must fix):\n')
  errors.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`)
    console.log(`  Issue: ${issue.issue}`)
    console.log(`  Code: ${issue.snippet}`)
    console.log()
  })
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (should review):\n')
  warnings.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`)
    console.log(`  Issue: ${issue.issue}`)
    console.log(`  Code: ${issue.snippet}`)
    console.log()
  })
}

if (info.length > 0) {
  console.log('ℹ️  INFO (for awareness):\n')
  info.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`)
    console.log(`  Issue: ${issue.issue}`)
    console.log(`  Code: ${issue.snippet}`)
    console.log()
  })
}

if (issues.length === 0) {
  console.log('✅ No issues found! Migration looks good.\n')
} else {
  console.log(`\n📊 Summary: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info\n`)
}

process.exit(errors.length > 0 ? 1 : 0)
