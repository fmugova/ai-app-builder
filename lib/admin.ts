import { prisma } from '@/lib/prisma'

// Async version - use this in API routes and server components
export async function isAdminAsync(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { role: true }
    })
    return user?.role === 'admin'
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}

// Sync version - fallback for client-side (checks env var)
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  
  // Fallback list if env var not set
  if (ADMIN_EMAILS.length === 0) {
    ADMIN_EMAILS.push('admin@buildflow-ai.app')
  }
  
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}