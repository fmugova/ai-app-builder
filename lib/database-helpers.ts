import { prisma } from '@/lib/prisma'

// Utility: Check for duplicate ApiTemplate.name
export async function checkApiTemplateNameDuplicates() {
  try {
    const duplicates = await prisma.apiTemplate.groupBy({
      by: ['name'],
      _count: { name: true },
      having: { name: { _count: { gt: 1 } } }
    })
    return duplicates
  } catch (error: unknown) {
    console.error('ApiTemplate name duplicate check error:', error)
    return { error: 'Failed to check ApiTemplate name duplicates' }
  }
}

// Utility: Check for duplicate DatabaseConnection.projectId
export async function checkDatabaseConnectionProjectIdDuplicates() {
  try {
    const duplicates = await prisma.databaseConnection.groupBy({
      by: ['projectId'],
      _count: { projectId: true },
      having: { projectId: { _count: { gt: 1 } } }
    })
    return duplicates
  } catch (error: unknown) {
    console.error('DatabaseConnection projectId duplicate check error:', error)
    return { error: 'Failed to check DatabaseConnection projectId duplicates' }
  }
}