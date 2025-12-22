import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Check VercelConnection table structure
    const vercelCols = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'VercelConnection'
      ORDER BY ordinal_position;
    `;
    console.log('\n📋 VercelConnection columns:');
    console.log(vercelCols);

    // Check Deployment table structure
    const deploymentCols = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Deployment'
      ORDER BY ordinal_position;
    `;
    console.log('\n📋 Deployment columns:');
    console.log(deploymentCols);

    // Check existing data
    const vercelCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "VercelConnection";`;
    const deploymentCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "Deployment";`;
    
    console.log('\n📊 Data counts:');
    console.log('VercelConnection:', vercelCount);
    console.log('Deployment:', deploymentCount);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
