// scripts/check-schema.ts
// Check what fields exist in your User model

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSchema() {
  try {
    console.log('🔍 Checking User schema...\n')

    // Try to get a user to see what fields are available
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    if (!user) {
      console.log('⚠️  No users found in database')
      console.log('   Please create a user first')
      return
    }

    console.log('✅ Basic fields found:')
    console.log('   - id')
    console.log('   - email')
    console.log('   - emailVerified')
    console.log('')

    // Check for 2FA fields
    console.log('🔐 Checking 2FA fields...\n')

    try {
      const userWith2FA = await prisma.user.findFirst({
        select: {
          id: true,
          twoFactorEnabled: true,
        },
      })
      console.log('✅ twoFactorEnabled field exists')
    } catch (e) {
      console.log('❌ twoFactorEnabled field does NOT exist')
    }

    try {
      const userWith2FA = await prisma.user.findFirst({
        select: {
          id: true,
          twoFactorSecret: true,
        },
      })
      console.log('✅ twoFactorSecret field exists')
    } catch (e) {
      console.log('❌ twoFactorSecret field does NOT exist')
    }

    try {
      const userWith2FA = await prisma.user.findFirst({
        select: {
          id: true,
          twoFactorBackupCodes: true,
        },
      })
      console.log('✅ twoFactorBackupCodes field exists')
    } catch (e) {
      console.log('❌ twoFactorBackupCodes field does NOT exist')
    }

    console.log('')
    console.log('💡 Tip: If 2FA fields are missing, you need to:')
    console.log('   1. Add them to your Prisma schema')
    console.log('   2. Run: npx prisma db push')
    console.log('   3. Or run: npx prisma migrate dev')

  } catch (error) {
    console.error('❌ Error checking schema:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchema()
