import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import VerifyEmailNoticeClient from './VerifyEmailNoticeClient'

export default async function VerifyEmailNoticePage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  // Check if already verified
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      emailVerified: true,
      email: true,
      name: true,
    },
  })

  if (user?.emailVerified) {
    redirect('/dashboard')
  }

  return <VerifyEmailNoticeClient email={user?.email || ''} name={user?.name || ''} />
}
