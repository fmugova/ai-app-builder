// check-production-db.ts
import { Client } from 'pg';

// Use DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;

async function checkProductionDatabase() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment variables.');
    process.exit(1);
  }
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log('✅ Production DB connection successful:', res.rows[0]);
  } catch (err) {
    console.error('❌ Production DB connection failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkProductionDatabase();
