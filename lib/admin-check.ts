// lib/admin-check.ts
// Server-only admin check function to avoid bundling Prisma in client
import 'server-only'
import { prisma } from '@/lib/prisma'

export async function checkIfAdmin(email: string): Promise<boolean> {
  if (!email) {
    return false
  }

  try {
    // Check if Prisma client is available
    if (!prisma) {
      console.error('[Admin Check] Prisma client not available')
      return false
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true }
    })
    
    return user?.role === 'admin'
  } catch (error) {
    // Log error but don't throw - gracefully degrade
    console.error('[Admin Check] Error checking admin status:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}
