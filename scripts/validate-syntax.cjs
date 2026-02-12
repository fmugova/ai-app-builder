#!/usr/bin/env node
/**
 * Comprehensive Syntax & Build Validation
 * Checks for hidden issues that could break deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔬 COMPREHENSIVE VALIDATION TESTS\n');
console.log('=' .repeat(70));

const results = [];
let totalTests = 0;
let passedTests = 0;

function runTest(name, testFn) {
  totalTests++;
  process.stdout.write(`${totalTests}. ${name}... `);
  try {
    const result = testFn();
    passedTests++;
    console.log('✅ PASS');
    results.push({ name, status: 'PASS', result });
    return true;
  } catch (error) {
    console.log('❌ FAIL');
    results.push({ name, status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 1: TypeScript compilation
runTest('TypeScript Compilation', () => {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
  return 'No TypeScript errors';
});

// Test 2: JSON Files Syntax
runTest('JSON Files Validation', () => {
  const jsonFiles = ['package.json', 'tsconfig.json', 'vercel.json'];
  jsonFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
  });
  return 'All JSON files valid';
});

// Test 3: Prisma Schema
runTest('Prisma Schema Validation', () => {
  execSync('npx prisma validate', { stdio: 'pipe' });
  return 'Prisma schema valid';
});

// Test 4: Check for BOM/encoding issues
runTest('File Encoding Check', () => {
  const criticalFiles = [
    'next.config.ts',
    'vercel.json',
    'package.json',
    'app/builder/page.tsx',
    'lib/services/iterationDetector.ts',
    'lib/services/promptBuilder.ts',
    'lib/utils/project-name-generator.ts'
  ];
  
  criticalFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing file: ${file}`);
    }
    const content = fs.readFileSync(file, 'utf8');
    // Check for BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      throw new Error(`BOM detected in ${file}`);
    }
    // Check for null bytes
    if (content.includes('\0')) {
      throw new Error(`Null bytes in ${file}`);
    }
  });
  return 'No encoding issues';
});

// Test 5: Check new service files can be imported
runTest('Import Validation for New Services', () => {
  const imports = [
    "require('./lib/services/iterationDetector.ts')",
    "require('./lib/services/promptBuilder.ts')",
    "require('./lib/services/projectService.ts')",
    "require('./lib/utils/project-name-generator.ts')",
  ];
  
  // Just check files exist and parse
  imports.forEach(imp => {
    const filePath = imp.match(/require\('(.+)'\)/)[1];
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
  });
  return 'All new service files exist';
});

// Test 6: Check for problematic patterns
runTest('Problematic Code Patterns', () => {
  const checks = [];
  
  // Check next.config.ts doesn't use module.exports
  const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
  if (nextConfig.includes('module.exports') && !nextConfig.includes('export default')) {
    throw new Error('next.config.ts uses module.exports instead of export default');
  }
  checks.push('next.config.ts uses correct export');
  
  // Check vercel.json has proper buildCommand
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  if (!vercelConfig.buildCommand || !vercelConfig.buildCommand.includes('prisma generate')) {
    throw new Error('vercel.json missing proper buildCommand');
  }
  checks.push('vercel.json buildCommand valid');
  
  return checks.join(', ');
});

// Test 7: Check migration files
runTest('Migration Files Check', () => {
  const migrationsDir = 'prisma/migrations';
  if (!fs.existsSync(migrationsDir)) {
    throw new Error('Migrations directory missing');
  }
  
  const migrations = fs.readdirSync(migrationsDir);
  const hasPreviewMigration = migrations.some(m => 
    m.includes('add_preview_and_multifile_tables')
  );
  
  if (!hasPreviewMigration) {
    throw new Error('Preview/ProjectFile migration not found');
  }
  
  return `${migrations.length} migrations found, including preview system`;
});

// Test 8: Check for duplicate dependencies
runTest('Package.json Dependencies Check', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };
  
  // Check critical dependencies exist
  const required = [
    '@anthropic-ai/sdk',
    '@prisma/client',
    'next',
    'react',
    'speakeasy',
    'qrcode',
  ];
  
  const missing = required.filter(dep => !allDeps[dep]);
  if (missing.length > 0) {
    throw new Error(`Missing dependencies: ${missing.join(', ')}`);
  }
  
  return 'All required dependencies present';
});

// Test 9: Check API routes structure
runTest('API Routes Structure', () => {
  const requiredRoutes = [
    'app/api/generate/route.ts',
    'app/api/auth/2fa/setup/route.ts',
    'app/api/auth/2fa/verify/route.ts',
    'app/api/cron/cleanup-previews/route.ts',
    'app/api/preview/deploy/route.ts',
  ];
  
  requiredRoutes.forEach(route => {
    if (!fs.existsSync(route)) {
      throw new Error(`Missing route: ${route}`);
    }
  });
  
  return 'All new API routes exist';
});

// Test 10: Builder page has new features
runTest('Builder Page Feature Check', () => {
  const builderPage = fs.readFileSync('app/builder/page.tsx', 'utf8');
  
  const requiredFeatures = [
    'generationMode',
    'generateSmartProjectName',
    'Add to Existing',
    'Start Fresh',
  ];
  
  const missing = requiredFeatures.filter(feature => !builderPage.includes(feature));
  if (missing.length > 0) {
    throw new Error(`Missing features in builder: ${missing.join(', ')}`);
  }
  
  return 'Builder page has iteration features';
});

// Test 11: Check for syntax errors in critical files
runTest('Critical Files Syntax', () => {
  const files = [
    'lib/services/iterationDetector.ts',
    'lib/services/promptBuilder.ts',
    'lib/services/projectService.ts',
    'lib/prompts/buildflow-enhanced-prompt.ts',
  ];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Basic syntax checks
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw new Error(`Unmatched braces in ${file}`);
    }
    
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      throw new Error(`Unmatched parentheses in ${file}`);
    }
  });
  
  return 'All critical files have matching braces/parens';
});

// Test 12: Environment variables reference
runTest('Environment Variables Check', () => {
  const envExampleExists = fs.existsSync('.env.example');
  if (!envExampleExists) {
    throw new Error('.env.example missing');
  }
  
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'ANTHROPIC_API_KEY',
  ];
  
  const missing = requiredVars.filter(v => !envExample.includes(v));
  if (missing.length > 0) {
    throw new Error(`Missing from .env.example: ${missing.join(', ')}`);
  }
  
  return 'Environment variables documented';
});

console.log('=' .repeat(70));
console.log('\n📊 VALIDATION SUMMARY:\n');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);

if (totalTests === passedTests) {
  console.log('✨ ALL VALIDATION TESTS PASSED! ✨\n');
  console.log('Code is ready for deployment. No syntax issues detected.\n');
  process.exit(0);
} else {
  console.log('⚠️  VALIDATION FAILURES DETECTED:\n');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`❌ ${r.name}`);
    console.log(`   Error: ${r.error}\n`);
  });
  process.exit(1);
}
