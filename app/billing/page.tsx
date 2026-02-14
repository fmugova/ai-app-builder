import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  return <BillingClient userEmail={session.user.email} />
}
