#!/usr/bin/env node
/**
 * Deployment Blocker Detection
 * Identifies specific issues that prevent Vercel deployments
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 DEPLOYMENT BLOCKER DETECTION\n');
console.log('=' .repeat(70));

const blockers = [];
const warnings = [];

// Check 1: Build actually works
console.log('\n1️⃣ Testing Production Build...');
try {
  execSync('npm run build', { stdio: 'pipe', timeout: 180000 });
  console.log('   ✅ Build completes successfully');
} catch (error) {
  blockers.push({
    issue: 'Build fails locally',
    details: error.stderr?.toString().substring(0, 500) || error.message,
    fix: 'Run: npm run build and check for errors'
  });
  console.log('   ❌ Build FAILS');
}

// Check 2: Vercel configuration
console.log('\n2️⃣ Checking Vercel Configuration...');
const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

if (!vercelJson.buildCommand) {
  blockers.push({
    issue: 'No buildCommand in vercel.json',
    fix: 'Add buildCommand to vercel.json'
  });
} else if (!vercelJson.buildCommand.includes('next build')) {
  warnings.push({
    issue: 'buildCommand may not build Next.js app',
    current: vercelJson.buildCommand,
    suggested: 'Should end with: next build'
  });
}
console.log(`   Build Command: "${vercelJson.buildCommand}"`);

// Check 3: Git status
console.log('\n3️⃣ Checking Git Status...');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    warnings.push({
      issue: 'Uncommitted changes detected',
      details: 'Local changes not in git',
      fix: 'Commit all changes: git add -A && git commit'
    });
    console.log('   ⚠️  Uncommitted changes exist');
  } else {
    console.log('   ✅ Working directory clean');
  }
} catch {
  console.log('   ℹ️  Could not check git status');
}

// Check 4: Remote sync
console.log('\n4️⃣ Checking Remote Sync...');
try {
  const localHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const remoteHead = execSync('git rev-parse production/main', { encoding: 'utf8' }).trim();
  
  if (localHead !== remoteHead) {
    blockers.push({
      issue: 'Local and production remote OUT OF SYNC',
      local: localHead.substring(0, 7),
      remote: remoteHead.substring(0, 7),
      fix: 'Run: git push production main'
    });
    console.log(`   ❌ Out of sync - Local: ${localHead.substring(0, 7)}, Remote: ${remoteHead.substring(0, 7)}`);
  } else {
    console.log(`   ✅ Local and production remote in sync (${localHead.substring(0, 7)})`);
  }
} catch (e) {
  warnings.push({
    issue: 'Could not verify remote sync',
    details: e.message
  });
}

// Check 5: Node modules
console.log('\n5️⃣ Checking Dependencies...');
if (!fs.existsSync('node_modules')) {
  blockers.push({
    issue: 'node_modules missing',
    fix: 'Run: npm install'
  });
  console.log('   ❌ node_modules missing');
} else {
  const pkgLock = fs.existsSync('package-lock.json');
  console.log(`   ✅ node_modules exists${pkgLock ? ' (with package-lock.json)' : ''}`);
}

// Check 6: Critical files exist
console.log('\n6️⃣ Checking Critical Files...');
const criticalFiles = [
  'next.config.ts',
  'app/builder/page.tsx',
  'lib/services/iterationDetector.ts',
  'lib/services/promptBuilder.ts',
  'lib/services/projectService.ts',
  'lib/utils/project-name-generator.ts',
  'prisma/migrations/20260212070645_add_preview_and_multifile_tables/migration.sql'
];

const missing = criticalFiles.filter(f => !fs.existsSync(f));
if (missing.length > 0) {
  blockers.push({
    issue: 'Critical files missing',
    files: missing,
    fix: 'Ensure all files are committed and pushed'
  });
  console.log(`   ❌ Missing files: ${missing.join(', ')}`);
} else {
  console.log(`   ✅ All critical files present (${criticalFiles.length} files)`);
}

// Check 7: .gitignore check
console.log('\n7️⃣ Checking .gitignore...');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const problematicIgnores = [
  { pattern: /^lib\//m, name: 'lib/' },
  { pattern: /^app\//m, name: 'app/' },
  { pattern: /^components\//m, name: 'components/' },
];

problematicIgnores.forEach(({ pattern, name }) => {
  if (pattern.test(gitignore)) {
    blockers.push({
      issue: `.gitignore blocks critical directory: ${name}`,
      fix: `Remove '${name}' from .gitignore`
    });
    console.log(`   ❌ ${name} is ignored!`);
  }
});

if (blockers.filter(b => b.issue.includes('.gitignore')).length === 0) {
  console.log('   ✅ No critical directories in .gitignore');
}

// Check 8: package.json type
console.log('\n8️⃣ Checking package.json Module Type...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.type === 'module') {
  console.log('   ℹ️  Package type: "module" (ESM)');
  
  // Check if next.config uses proper export
  const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
  if (nextConfig.includes('module.exports') && !nextConfig.includes('export default')) {
    blockers.push({
      issue: 'next.config.ts uses CommonJS in ESM project',
      fix: 'Change module.exports to export default'
    });
    console.log('   ❌ next.config.ts has module.exports (should use export default)');
  } else {
    console.log('   ✅ next.config.ts uses proper exports');
  }
} else {
  console.log('   ✅ Package type: CommonJS');
}

// Results
console.log('\n' + '=' .repeat(70));
console.log('\n📋 DEPLOYMENT READINESS REPORT:\n');

if (blockers.length === 0 && warnings.length === 0) {
  console.log('✅ NO BLOCKERS DETECTED');
  console.log('✅ NO WARNINGS');
  console.log('\n🎉 Code is FULLY READY for deployment!\n');
  console.log('If Vercel still not deploying, the issue is:');
  console.log('  • Vercel webhook not configured');
  console.log('  • Vercel connected to wrong repo');
  console.log('  • Vercel auto-deploy disabled');
  console.log('  • GitHub integration broken\n');
} else {
  if (blockers.length > 0) {
    console.log('🚨 CRITICAL BLOCKERS FOUND:\n');
    blockers.forEach((blocker, i) => {
      console.log(`${i + 1}. ${blocker.issue}`);
      if (blocker.details) console.log(`   Details: ${blocker.details}`);
      if (blocker.fix) console.log(`   Fix: ${blocker.fix}`);
      console.log('');
    });
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach((warning, i) => {
      console.log(`${i + 1}. ${warning.issue}`);
      if (warning.details) console.log(`   Details: ${warning.details}`);
      if (warning.fix) console.log(`   Fix: ${warning.fix}`);
      console.log('');
    });
  }
}

console.log('=' .repeat(70));

process.exit(blockers.length === 0 ? 0 : 1);
