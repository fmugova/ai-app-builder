/**
 * Webhook Cleanup Script
 * 
 * Remove old processed webhook events (>90 days)
 * 
 * Usage: npm run webhook:cleanup
 */

import { cleanupOldWebhookEvents } from '../lib/webhooks/webhook-logger';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('\n🧹 Cleaning up old webhook events...\n');

  const deletedCount = await cleanupOldWebhookEvents();

  console.log(`✅ Deleted ${deletedCount} old webhook events (>90 days)\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
