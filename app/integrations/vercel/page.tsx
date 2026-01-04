import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import VercelIntegrationClient from './VercelIntegrationClient'

export default async function VercelIntegrationPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return <VercelIntegrationClient />
}