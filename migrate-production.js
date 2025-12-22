// Run this script to push schema changes to production database
// Usage: node migrate-production.js

const { execSync } = require('child_process');

console.log('🔄 Pushing schema to production database...');

try {
  // Push schema without requiring a migration file
  execSync('npx prisma db push --accept-data-loss', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('✅ Schema pushed successfully!');
  console.log('🔄 Regenerating Prisma Client...');
  
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Done! Deploy to Vercel to apply changes.');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
