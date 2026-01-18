// scripts/migrate-params.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function migrateFile(filePath: string) {
  let content = readFileSync(filePath, 'utf-8');

  // Pattern 1: Route handlers
  content = content.replace(
    /context:\s*{\s*params:\s*{([^}]+)}\s*}/g,
    'context: { params: Promise<{$1}> }'
  );

  // Pattern 2: Add await before context.params usage
  content = content.replace(
    /(\w+)\s*=\s*context\.params(?!\.)/g,
    '$1 = await context.params'
  );

  // Pattern 3: Page components
  content = content.replace(
    /params\s*}:\s*{\s*params:\s*{([^}]+)}\s*}/g,
    'params }: { params: Promise<{$1}> }'
  );

  // Pattern 4: generateMetadata
  content = content.replace(
    /export async function generateMetadata\s*\(\s*{\s*params\s*}:\s*{\s*params:\s*{([^}]+)}\s*}\s*\)/g,
    'export async function generateMetadata({ params }: { params: Promise<{$1}> })'
  );

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Migrated ${filePath}`);
}

const files = [
  ...await glob('./app/**/route.ts'),
  ...await glob('./app/**/page.tsx'),
  ...await glob('./app/**/layout.tsx')
];
for (const file of files) {
  await migrateFile(file);
}

// Guidance for next steps:
// 1. Run this script: npx tsx scripts/migrate-params.ts
// 2. Review the output for any files that were migrated.
// 3. Manually check any files with custom logic or edge cases.
// 4. Run your tests and build to confirm everything works.
// 5. Commit and push your changes when validated.