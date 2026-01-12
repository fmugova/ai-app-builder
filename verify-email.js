const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyEmail(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })
    console.log(`✓ Email verified for: ${user.email}`)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: node verify-email.js <email>')
  process.exit(1)
}

verifyEmail(email)
