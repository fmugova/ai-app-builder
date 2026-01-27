// scripts/check-duplicates.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for duplicate ApiTemplate.name...')
  const apiTemplateDuplicates = await prisma.apiTemplate.groupBy({
    by: ['name'],
    _count: { name: true },
    having: { name: { _count: { gt: 1 } } }
  })
  if (apiTemplateDuplicates.length) {
    console.log('Duplicates found in ApiTemplate.name:')
    apiTemplateDuplicates.forEach(d => console.log(d))
  } else {
    console.log('No duplicates found in ApiTemplate.name.')
  }

  console.log('\nChecking for duplicate DatabaseConnection.projectId...')
  const dbConnDuplicates = await prisma.databaseConnection.groupBy({
    by: ['projectId'],
    _count: { projectId: true },
    having: { projectId: { _count: { gt: 1 } } }
  })
  if (dbConnDuplicates.length) {
    console.log('Duplicates found in DatabaseConnection.projectId:')
    dbConnDuplicates.forEach(d => console.log(d))
  } else {
    console.log('No duplicates found in DatabaseConnection.projectId.')
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
