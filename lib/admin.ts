import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []

/**
 * Check if a user is an admin by email (async version)
 */
export async function isAdminAsyncByEmail(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true }
    })
    return user?.role === 'admin'
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}

/**
 * Check if a user is an admin by ID
 */
export async function isAdminById(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    return user?.role === 'admin'
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}

export async function isAdminAsync(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return false
    }

    // Check if user email is in admin list
    if (ADMIN_EMAILS.includes(session.user.email)) {
      return true
    }

    // Check database for admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    return user?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Synchronous version (for client components)
export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

// Get admin emails list
export function getAdminEmails(): string[] {
  return ADMIN_EMAILS
}