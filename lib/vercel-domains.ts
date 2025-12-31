/**
 * Vercel Domains API Integration
 * Manages custom domain configuration via Vercel API
 */

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN!
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID!

interface VercelDomainConfig {
  name: string
  gitBranch?: string
  redirect?: string
  redirectStatusCode?: number
}

interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  redirect?: string
  verified: boolean
  verification?: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
  createdAt: number
  updatedAt: number
}

const VERCEL_API_BASE = 'https://api.vercel.com'

async function vercelFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${VERCEL_API_BASE}${endpoint}`
  const headers = {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const response = await fetch(url, { ...options, headers })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Vercel API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Add a custom domain to Vercel project
 */
export async function addDomainToVercel(domain: string): Promise<VercelDomainResponse> {
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  
  return vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`, {
    method: 'POST',
    body: JSON.stringify({ name: domain })
  })
}

/**
 * Get domain configuration and verification status
 */
export async function getDomainStatus(domain: string): Promise<VercelDomainResponse> {
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  
  return vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamQuery}`)
}

/**
 * Verify domain ownership
 */
export async function verifyDomain(domain: string): Promise<VercelDomainResponse> {
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  
  return vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify${teamQuery}`, {
    method: 'POST'
  })
}

/**
 * Remove domain from Vercel project
 */
export async function removeDomainFromVercel(domain: string): Promise<void> {
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  
  await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamQuery}`, {
    method: 'DELETE'
  })
}

/**
 * Get DNS configuration instructions for a domain
 */
export function getDNSInstructions(domain: string, vercelDomain: string = 'cname.vercel-dns.com') {
  const isApex = !domain.includes('.')  || domain.split('.').length === 2
  
  if (isApex) {
    return {
      type: 'A',
      name: '@',
      value: '76.76.21.21', // Vercel's A record
      instructions: `Add an A record pointing to Vercel's IP address`
    }
  } else {
    return {
      type: 'CNAME',
      name: domain.split('.')[0],
      value: vercelDomain,
      instructions: `Add a CNAME record pointing to ${vercelDomain}`
    }
  }
}

/**
 * Generate verification TXT record
 */
export function generateVerificationRecord(domain: string, projectId: string) {
  return {
    type: 'TXT',
    name: '_vercel',
    value: `vc-domain-verify=${projectId}-${Date.now()}`,
    instructions: 'Add this TXT record to verify domain ownership'
  }
}