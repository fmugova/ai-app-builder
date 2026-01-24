import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding promo codes...')

  // Launch promotion
  await prisma.promo_codes.upsert({
    where: { code: 'LAUNCH2024' },
    update: {},
    create: {
      id: 'launch-2024',
      code: 'LAUNCH2024',
      discountType: 'percentage',
      discountValue: 50,
      maxUses: 100,
      timesUsed: 0,
      validUntil: new Date('2024-12-31'),
      applicableTo: ['pro'],
      active: true,
    },
  })
  // Product Hunt special
  await prisma.promo_codes.upsert({
    where: { code: 'PRODUCTHUNT50' },
    update: {},
    create: {
      id: 'producthunt-50',
      code: 'PRODUCTHUNT50',
      discountType: 'percentage',
      discountValue: 50,
      maxUses: 100,
      timesUsed: 0,
      validUntil: new Date('2024-12-15'),
      applicableTo: ['pro'],
      active: true,
    },
  })
  // Early bird
  await prisma.promo_codes.upsert({
    where: { code: 'EARLYBIRD40' },
    update: {},
    create: {
      id: 'earlybird-40',
      code: 'EARLYBIRD40',
      discountType: 'percentage',
      discountValue: 40,
      maxUses: 500,
      timesUsed: 0,
      validUntil: new Date('2025-01-31'),
      applicableTo: ['pro'],
      active: true,
    },
  })
  // Student discount
  await prisma.promo_codes.upsert({
    where: { code: 'STUDENT70' },
    update: {},
    create: {
      id: 'student-70',
      code: 'STUDENT70',
      discountType: 'percentage',
      discountValue: 70,
      maxUses: -1, // Unlimited
      timesUsed: 0,
      validUntil: null,
      applicableTo: ['pro'],
      active: true,
    },
  })

  console.log('✅ Promo codes seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding promo codes:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })