import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    const tables = await prisma.$queryRaw<Array<{table_name: string, column_count: bigint}>>`
      SELECT 
        table_name,
        COUNT(column_name) as column_count
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('Project', 'ProjectFile', 'ProjectVersion')
      GROUP BY table_name
      ORDER BY table_name
    `;
    
    console.log('📊 Tables found in database:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.table_name} (${table.column_count} columns)`);
    });
    
    // Check for specific Project columns
    const projectColumns = await prisma.$queryRaw<Array<{column_name: string}>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Project'
        AND column_name IN ('multiPage', 'isMultiFile')
      ORDER BY column_name
    `;
    
    console.log('\n📋 Project iteration fields:');
    if (projectColumns.length > 0) {
      projectColumns.forEach(col => {
        console.log(`  ✓ ${col.column_name}`);
      });
    } else {
      console.log('  ⚠️  Missing: multiPage, isMultiFile');
    }
    
    // Check if ProjectFile table exists
    const projectFileExists = tables.find(t => t.table_name === 'ProjectFile');
    if (!projectFileExists) {
      console.log('\n⚠️  ProjectFile table is MISSING!');
      console.log('   Run: npx prisma db push');
    }
    
    const projectVersionExists = tables.find(t => t.table_name === 'ProjectVersion');
    if (!projectVersionExists) {
      console.log('\n⚠️  ProjectVersion table is MISSING!');
      console.log('   Run: npx prisma db push');
    }
    
    if (projectFileExists && projectVersionExists && projectColumns.length === 2) {
      console.log('\n✅ All iteration system tables and fields present!\n');
    } else {
      console.log('\n❌ Some tables/fields are missing. Run: npx prisma db push\n');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
