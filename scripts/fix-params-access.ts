// scripts/fix-params-access.ts
// Fixes params.id, params.slug, etc. access without await

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

async function fixFile(filePath: string): Promise<boolean> {
  let content = readFileSync(filePath, 'utf-8')
  let modified = false
  
  // Check if file has Promise<{ ... }> params type
  const hasPromiseParams = /params:\s*Promise</.test(content)
  
  if (!hasPromiseParams) {
    return false // Skip files without Promise params
  }
  
  // Check if file already awaits params
  const alreadyAwaits = /await\s+(context\.)?params/.test(content)
  
  if (alreadyAwaits) {
    return false // Already fixed
  }
  
  // Find function signatures
  const functionPattern = /export async function (GET|POST|PUT|DELETE|PATCH)\s*\([^)]*context:\s*{\s*params:\s*Promise<{([^}]+)}\s*}\s*\)\s*{/g
  
  let match
  while ((match = functionPattern.exec(content)) !== null) {
    const paramsContent = match[2]
    
    // Extract param names (e.g., "id: string" -> "id")
    const paramNames = paramsContent
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(Boolean)
    
    // Find the position right after the opening brace
    const functionStart = match.index + match[0].length
    
    // Create the await statement
    const destructure = paramNames.length === 1 
      ? `const { ${paramNames[0]} } = await context.params`
      : `const { ${paramNames.join(', ')} } = await context.params`
    
    // Insert the await statement
    const beforeFunction = content.substring(0, functionStart)
    const afterFunction = content.substring(functionStart)
    
    // Add proper indentation
    const awaitStatement = `\n  ${destructure}\n`
    
    content = beforeFunction + awaitStatement + afterFunction
    modified = true
  }
  
  // Also handle page component pattern
  const pagePattern = /export default async function \w+\s*\(\s*{\s*params[^}]*}\s*:\s*{\s*params:\s*Promise<{([^}]+)}\s*}\s*\)\s*{/g
  
  while ((match = pagePattern.exec(content)) !== null) {
    const paramsContent = match[1]
    const paramNames = paramsContent
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(Boolean)
    
    const functionStart = match.index + match[0].length
    const destructure = paramNames.length === 1
      ? `const { ${paramNames[0]} } = await params`
      : `const { ${paramNames.join(', ')} } = await params`
    
    const beforeFunction = content.substring(0, functionStart)
    const afterFunction = content.substring(functionStart)
    const awaitStatement = `\n  ${destructure}\n`
    
    content = beforeFunction + awaitStatement + afterFunction
    modified = true
  }
  
  if (modified) {
    writeFileSync(filePath, content, 'utf-8')
    return true
  }
  
  return false
}

async function main() {
  console.log('🔧 Fixing params access without await...\n')
  
  const files = await glob('app/**/*.{ts,tsx}')
  let fixedCount = 0
  
  for (const file of files) {
    try {
      const wasFixed = await fixFile(file)
      if (wasFixed) {
        console.log(`✓ Fixed ${file}`)
        fixedCount++
      }
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error)
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} files`)
  
  if (fixedCount > 0) {
    console.log('\nRun: npm run build')
  }
}

main()
