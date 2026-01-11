// lib/admin-check.ts
// Server-only admin check function to avoid bundling Prisma in client
import 'server-only'
import { prisma } from '@/lib/prisma'

export async function checkIfAdmin(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true }
    })
    return user?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}
