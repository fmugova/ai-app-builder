const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function updatePassword() {
  // Change this to your desired secure password
  const newPassword = 'BuildFlow2025!Secure';
  const hash = bcrypt.hashSync(newPassword, 12);
  const email = 'admin@buildflow-ai.app';
  
  try {
    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      // Update existing user
      const user = await prisma.user.update({
        where: { email },
        data: { password: hash }
      });
      console.log('✅ Password updated for:', user.email);
    } else {
      // Create new admin user
      const user = await prisma.user.create({
        data: {
          email,
          name: 'Admin',
          password: hash,
          role: 'admin',
          subscriptionTier: 'enterprise',
          generationsLimit: 9999,
          projectsLimit: 9999
        }
      });
      console.log('✅ Admin user created:', user.email);
    }
    
    console.log('New password:', newPassword);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
