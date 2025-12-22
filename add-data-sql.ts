import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDataDirectly() {
  try {
    // Example: Add a user directly with SQL
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        'newuser@example.com',
        'New User',
        'user',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING;
    `;

    console.log('✅ Data added successfully');

    // Query to verify
    const users = await prisma.$queryRaw`
      SELECT id, email, name, role FROM "User" 
      ORDER BY "createdAt" DESC LIMIT 5;
    `;
    console.log('\nRecent users:', users);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDataDirectly();
