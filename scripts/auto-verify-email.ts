// scripts/auto-verify-email.ts
// Simplified - Only uses emailVerified field

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
      console.log('✅ Email already verified at:', user.emailVerified)
      return
    }

    console.log('📝 Verifying email...')

    // ✅ Only update emailVerified field
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      },
    })

    console.log('✅ Email verified successfully!')
    console.log(`   User: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Verified at: ${new Date().toISOString()}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

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

    if (unverified.length === 0) {
      console.log('✅ All users are already verified!')
      return
    }

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

    console.log(`\n🎉 Successfully verified ${unverified.length} users!`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Show help
function showHelp() {
  console.log('📧 Email Verification Tool')
  console.log('')
  console.log('Usage:')
  console.log('  npm run verify-email <email>     - Verify specific email')
  console.log('  npm run verify-email --all       - Verify all unverified users')
  console.log('  npm run verify-email --help      - Show this help')
  console.log('')
  console.log('Examples:')
  console.log('  npm run verify-email user@example.com')
  console.log('  npm run verify-email --all')
}

// Get command line arguments
const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp()
  process.exit(0)
}

if (args[0] === '--all') {
  verifyAllUsers()
} else {
  const email = args[0]
  if (!email.includes('@')) {
    console.log('❌ Invalid email address')
    console.log('Please provide a valid email like: user@example.com')
    process.exit(1)
  }
  autoVerifyEmail(email)
}
