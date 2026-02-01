// scripts/auto-2fa.ts
// Automatic 2FA setup/disable for development/testing

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Generate a test 2FA secret
function generateTestSecret(): string {
  return crypto.randomBytes(20).toString('base64').replace(/[^A-Z2-7]/gi, '').substring(0, 32)
}

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

// Enable 2FA for a user
async function enable2FA(email: string) {
  try {
    console.log(`🔍 Finding user: ${email}`)
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    if (user.twoFactorEnabled) {
      console.log('⚠️  2FA already enabled')
      console.log(`   Secret: ${user.twoFactorSecret}`)
      return
    }

    const secret = generateTestSecret()
    const backupCodes = generateBackupCodes()

    console.log('📝 Enabling 2FA...')

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
      },
    })

    console.log('✅ 2FA enabled successfully!')
    console.log(`   User: ${user.email}`)
    console.log(`   Secret: ${secret}`)
    console.log(`   Backup codes:`)
    backupCodes.forEach((code, i) => {
      console.log(`     ${i + 1}. ${code}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Disable 2FA for a user
async function disable2FA(email: string) {
  try {
    console.log(`🔍 Finding user: ${email}`)
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    if (!user.twoFactorEnabled) {
      console.log('⚠️  2FA already disabled')
      return
    }

    console.log('📝 Disabling 2FA...')

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    })

    console.log('✅ 2FA disabled successfully!')
    console.log(`   User: ${user.email}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Show 2FA status
async function show2FAStatus(email: string) {
  try {
    console.log(`🔍 Finding user: ${email}`)
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('\n📊 2FA Status:')
    console.log(`   User: ${user.email}`)
    console.log(`   Enabled: ${user.twoFactorEnabled ? '✅ Yes' : '❌ No'}`)
    
    if (user.twoFactorEnabled) {
      console.log(`   Secret: ${user.twoFactorSecret}`)
      console.log(`   Backup codes: ${user.twoFactorBackupCodes?.length || 0}`)
      
      if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
        console.log('\n   Backup codes:')
        user.twoFactorBackupCodes.forEach((code, i) => {
          console.log(`     ${i + 1}. ${code}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log('📋 2FA Automation Tool')
  console.log('')
  console.log('Usage:')
  console.log('  npm run 2fa enable <email>    - Enable 2FA for user')
  console.log('  npm run 2fa disable <email>   - Disable 2FA for user')
  console.log('  npm run 2fa status <email>    - Show 2FA status')
  console.log('')
  console.log('Examples:')
  console.log('  npm run 2fa enable user@example.com')
  console.log('  npm run 2fa disable user@example.com')
  console.log('  npm run 2fa status user@example.com')
  process.exit(0)
}

const command = args[0]
const email = args[1]

if (!email) {
  console.log('❌ Please provide an email address')
  process.exit(1)
}

switch (command) {
  case 'enable':
    enable2FA(email)
    break
  case 'disable':
    disable2FA(email)
    break
  case 'status':
    show2FAStatus(email)
    break
  default:
    console.log(`❌ Unknown command: ${command}`)
    console.log('Use: enable, disable, or status')
    process.exit(1)
}