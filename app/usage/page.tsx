import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import UsageClient from './UsageClient'

export const dynamic = 'force-dynamic'

export default async function UsagePage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  return <UsageClient userEmail={session.user.email} />
}
