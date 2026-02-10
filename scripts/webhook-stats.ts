/**
 * Webhook Statistics Script
 * 
 * Display webhook processing statistics
 * 
 * Usage: npm run webhook:stats
 */

import { getWebhookStats } from '../lib/webhooks/webhook-logger';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('\n📊 Webhook Statistics\n');
  console.log('━'.repeat(60));

  const stats = await getWebhookStats();

  console.log(`
Total Events:     ${stats.total}
Processed:        ${stats.processed}
Failed:           ${stats.failed}
Pending:          ${stats.pending}
Success Rate:     ${stats.successRate}
  `);

  // Get recent failures
  const recentFailures = await prisma.webhookEvent.findMany({
    where: {
      status: 'failed',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
    select: {
      id: true,
      provider: true,
      eventType: true,
      error: true,
      attempts: true,
      createdAt: true,
    },
  });

  if (recentFailures.length > 0) {
    console.log('━'.repeat(60));
    console.log('\n⚠️  Recent Failures:\n');

    recentFailures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.provider}/${failure.eventType}`);
      console.log(`   ID: ${failure.id}`);
      console.log(`   Error: ${failure.error}`);
      console.log(`   Attempts: ${failure.attempts}`);
      console.log(`   Created: ${failure.createdAt.toISOString()}\n`);
    });
  }

  console.log('━'.repeat(60));
  console.log();

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
