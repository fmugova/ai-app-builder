// Script to encrypt existing GitHub tokens in the database
// Run with: node migrate-encrypt-github-tokens.js

import { PrismaClient } from '@prisma/client';
import { encrypt } from './lib/encryption.js';

const prisma = new PrismaClient();

async function migrateGitHubTokens() {
  try {
    console.log('🔒 Starting GitHub token encryption migration...\n');

    // Find all users with GitHub tokens
    const usersWithTokens = await prisma.user.findMany({
      where: {
        githubAccessToken: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        githubAccessToken: true,
        githubUsername: true
      }
    });

    console.log(`Found ${usersWithTokens.length} users with GitHub tokens\n`);

    if (usersWithTokens.length === 0) {
      console.log('✅ No tokens to encrypt. Migration complete!');
      return;
    }

    let encrypted = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersWithTokens) {
      try {
        // Check if token is already encrypted (contains colons in format iv:authTag:encrypted)
        const isAlreadyEncrypted = user.githubAccessToken?.includes(':') && 
                                   user.githubAccessToken.split(':').length === 3;

        if (isAlreadyEncrypted) {
          console.log(`⏭️  Skipped ${user.email} - token already encrypted`);
          skipped++;
          continue;
        }

        // Encrypt the token
        const encryptedToken = encrypt(user.githubAccessToken);

        // Update in database
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubAccessToken: encryptedToken
          }
        });

        console.log(`✅ Encrypted token for ${user.email} (@${user.githubUsername})`);
        encrypted++;

      } catch (error) {
        console.error(`❌ Failed to encrypt token for ${user.email}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   - Total users: ${usersWithTokens.length}`);
    console.log(`   - Encrypted: ${encrypted}`);
    console.log(`   - Skipped (already encrypted): ${skipped}`);
    console.log(`   - Errors: ${errors}`);

    if (errors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the logs.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateGitHubTokens();