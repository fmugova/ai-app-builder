// scripts/auto-verify-email.ts
// Automatic email verification for development/testing

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function autoVerifyEmail(email: string) {
  try {
    console.log(`🔍 Finding user: ${email}`)
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    if (user.emailVerified) {
      console.log('✅ Email already verified')
      return
    }

    console.log('📝 Marking email as verified...')

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      },
    })

    console.log('✅ Email verified successfully!')
    console.log(`   User: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Auto-verify all unverified users
async function verifyAllUsers() {
  try {
    console.log('🔍 Finding unverified users...')
    
    const unverified = await prisma.user.findMany({
      where: {
        emailVerified: null,
      },
      select: {
        id: true,
        email: true,
      },
    })

    console.log(`📊 Found ${unverified.length} unverified users`)

    for (const user of unverified) {
      console.log(`\n📝 Verifying: ${user.email}`)
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      })
      
      console.log('✅ Verified!')
    }

    console.log(`\n🎉 Verified ${unverified.length} users!`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log('📋 Usage:')
  console.log('  npm run verify-email <email>     - Verify specific email')
  console.log('  npm run verify-email --all       - Verify all users')
  console.log('')
  console.log('Examples:')
  console.log('  npm run verify-email user@example.com')
  console.log('  npm run verify-email --all')
  process.exit(0)
}

if (args[0] === '--all') {
  verifyAllUsers()
} else {
  autoVerifyEmail(args[0])
}