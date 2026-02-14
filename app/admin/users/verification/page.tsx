import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import VerificationDashboardClient from './VerificationDashboardClient'

export default async function UserVerificationPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (user?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch all users with verification status
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      role: true,
      subscriptionTier: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const stats = {
    total: users.length,
    verified: users.filter(u => u.emailVerified).length,
    unverified: users.filter(u => !u.emailVerified).length,
    verifiedToday: users.filter(u => {
      if (!u.emailVerified) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(u.emailVerified) >= today
    }).length,
  }

  return <VerificationDashboardClient users={users} stats={stats} />
}
