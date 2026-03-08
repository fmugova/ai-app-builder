import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import VercelIntegrationClient from './VercelIntegrationClient'

export const dynamic = 'force-dynamic'

export default async function VercelIntegrationPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // Stale/invalid JWT — treat as unauthenticated
  }
  
  if (!session) {
    redirect('/auth/signin')
  }

  return <VercelIntegrationClient />
}
