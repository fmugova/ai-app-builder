// scripts/auto-verify-email.ts
// ONLY updates emailVerified field - nothing else!

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyEmail(email: string) {
  try {
    console.log(`🔍 Finding: ${email}`)
    
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })

    console.log('✅ Verified!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function verifyAll() {
  try {
    const result = await prisma.user.updateMany({
      where: { emailVerified: null },
      data: { emailVerified: new Date() },
    })

    console.log(`✅ Verified ${result.count} users!`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const args = process.argv.slice(2)
if (args[0] === '--all') {
  verifyAll()
} else if (args[0]) {
  verifyEmail(args[0])
} else {
  console.log('Usage: npm run verify-email <email> or --all')
}