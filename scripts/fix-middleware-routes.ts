import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function main() {
  const files = await glob('app/api/**/*.ts');

  for (const file of files) {
    let content = readFileSync(file, 'utf-8');

    // Only process files with ApiHandler
    if (!content.includes('ApiHandler<')) continue;

    // Fix 1: Remove ApiHandler type and ...rest
    content = content.replace(
      /export const (GET|POST|PUT|DELETE|PATCH): ApiHandler<([^>]+)> = async \(req, context, \.\.\.rest: any\[\]\) => {/g,
      'export const $1 = async (\n  req: NextRequest,\n  context: { params: Promise<$2> }\n) => {'
    );

    // Fix 2: Remove ...rest from composed call
    content = content.replace(
      /return composed\(req, { params }, \.\.\.rest\)/g,
      'return composed(req, { params })'
    );

    // Fix 3: Add types to withResourceOwnership callbacks
    content = content.replace(
      /withResourceOwnership\('([^']+)', \(p\) => p\.(\w+)\)/g,
      "withResourceOwnership('$1', (p: { $2: string }) => p.$2)"
    );

    writeFileSync(file, content);
    console.log(`✓ Fixed ${file}`);
  }
}

main();
