#!/usr/bin/env node
/**
 * Deployment Verification Checklist
 * Run this to verify all features from recent commits are deployed
 */

console.log('🔍 DEPLOYMENT VERIFICATION CHECKLIST\n');
console.log('Run these checks on your PRODUCTION deployment:\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 COMMITS THAT SHOULD BE DEPLOYED (since 2bb2f5d):\n');

const commits = [
  {
    sha: 'd975169',
    title: 'Fix: Make build tolerant of migration warnings',
    verify: 'Check vercel.json buildCommand has migration error handling'
  },
  {
    sha: '58502a7',
    title: 'Fix: Use ES module syntax in next.config.ts',
    verify: 'Check next.config.ts uses "export default" (not module.exports)'
  },
  {
    sha: '902962e',
    title: 'Fix: Add Prisma migration for Preview, ProjectFile, ProjectVersion',
    verify: 'Check prisma/migrations/ folder has 20260212070645_add_preview_and_multifile_tables'
  },
  {
    sha: '8d2b7c0',
    title: 'Add DB table check script and SQL query',
    verify: 'Check scripts/check-iteration-tables.ts exists'
  },
  {
    sha: '2926e3a',
    title: 'Fix: Add missing code property to APIEndpoint test mocks',
    verify: 'Check components/APITestingPanel.test.tsx has code property in mocks'
  },
  {
    sha: '2765aaf',
    title: 'Add iteration-aware generation system + 2FA UI',
    verify: [
      'lib/services/iterationDetector.ts exists',
      'lib/services/promptBuilder.ts exists',
      'lib/services/projectService.ts exists',
      'app/account/security/2fa/page.tsx exists',
      'components/TwoFactorCard.tsx exists'
    ]
  },
  {
    sha: '60a7c63',
    title: 'Support beacon (text/plain) and JSON bodies',
    verify: 'app/api/analytics/track/route.ts handles both JSON and beacon requests'
  },
  {
    sha: '88c291d',
    title: 'Add dual preview system and DB migration',
    verify: [
      'components/DualPreviewSystem.tsx exists',
      'app/api/preview/deploy/route.ts exists',
      'app/api/cron/cleanup-previews/route.ts exists',
      'vercel.json has crons configuration'
    ]
  }
];

commits.forEach((commit, index) => {
  console.log(`${index + 1}. [${commit.sha}] ${commit.title}`);
  if (Array.isArray(commit.verify)) {
    commit.verify.forEach(check => console.log(`   • ${check}`));
  } else {
    console.log(`   • ${commit.verify}`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 FUNCTIONAL TESTS TO RUN ON PRODUCTION:\n');

console.log('1. ITERATION SYSTEM TEST');
console.log('   • Go to /builder page');
console.log('   • Generate a project');
console.log('   • You should see "🔄 Add to Existing" / "✨ Start Fresh" toggle buttons');
console.log('   • Try iterating on the project\n');

console.log('2. 2FA SECURITY TEST');
console.log('   • Go to /account/security/2fa');
console.log('   • Page should load without errors');
console.log('   • Should show 2FA setup options\n');

console.log('3. PREVIEW SYSTEM TEST');
console.log('   • Cron job endpoint: /api/cron/cleanup-previews should exist');
console.log('   • Preview deployment endpoint: /api/preview/deploy should exist\n');

console.log('4. ANALYTICS TRACK TEST');
console.log('   • Analytics should accept both JSON and beacon requests');
console.log('   • Check /api/analytics/track accepts text/plain content-type\n');

console.log('5. DATABASE MIGRATION TEST');
console.log('   • Preview, ProjectFile, ProjectVersion tables should exist');
console.log('   • Run in production database:');
console.log('     SELECT table_name FROM information_schema.tables');
console.log('     WHERE table_schema = \'public\' AND table_name IN (\'Preview\', \'ProjectFile\', \'ProjectVersion\');\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 VERIFICATION COMMANDS:\n');

console.log('To check deployed commit on Vercel:');
console.log('  • Open Vercel Dashboard → Your Project → Latest Deployment');
console.log('  • Look for "Git Commit SHA" - should be: d975169');
console.log('  • Check "Source" column - should show all 8 commits\n');

console.log('To verify files exist in deployment:');
console.log('  • Vercel Dashboard → Deployment → "..." menu → "View Source"');
console.log('  • Navigate to check files listed above exist\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ EXPECTED RESULT:');
console.log('  • Deployed commit: d975169f7f739c3f8876fc7a60bd9ec6faf024e8');
console.log('  • All 8 commits included in build');
console.log('  • All new files present in deployment');
console.log('  • No build errors in logs');
console.log('  • All functional tests pass\n');

console.log('❌ IF DEPLOYMENT IS MISSING COMMITS:');
console.log('  • Check Vercel is connected to: github.com/fmugova/BuildFlow-Production');
console.log('  • Verify Production Branch is: main');
console.log('  • Latest commit on that repo should be: d975169');
console.log('  • Try: git push production main --force (last resort)\n');

console.log('═══════════════════════════════════════════════════════════════\n');
