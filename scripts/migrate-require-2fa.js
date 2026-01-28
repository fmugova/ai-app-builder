import { prisma } from '@/lib/prisma'

async function migrateAllUsersRequire2FA() {
  const result = await prisma.user.updateMany({
    data: { twoFactorRequired: true },
  })
  console.log(`Updated ${result.count} users to require 2FA setup.`)
}

migrateAllUsersRequire2FA().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
