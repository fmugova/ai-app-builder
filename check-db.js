const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkDatabase() {
  console.log('🔍 Checking database connection...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');

    // Check User table
    const userCount = await prisma.user.count();
    console.log(`✅ User table exists. Found ${userCount} users.\n`);

    // Check Project table
    const projectCount = await prisma.project.count();
    console.log(`✅ Project table exists. Found ${projectCount} projects.\n`);

    // Try to create demo user WITH PASSWORD
    const demoEmail = 'demo@buildflow.app';
    let demoUser = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (demoUser) {
      console.log('✅ Demo user exists:', demoUser.email);
    } else {
      console.log('Creating demo user with password...');
      demoUser = await prisma.user.create({
        data: {
          email: demoEmail,
          name: 'Demo User',
          password: 'demo-password-not-used', // ADDED PASSWORD
        },
      });
      console.log('✅ Demo user created:', demoUser.email);
    }

    console.log('\n✅ All checks passed! Your database is working correctly.');
    console.log('\n🎉 Ready to save projects!');
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();