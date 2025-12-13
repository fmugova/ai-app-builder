// test-supabase-connection.ts
import { Client } from 'pg';

const connectionString = 'postgresql://postgres.szwruvvcjmwxdigthjze:Ck9Rw9WCg#hg5c#@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function testConnection() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as result');
    console.log('Connection successful:', res.rows[0]);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
