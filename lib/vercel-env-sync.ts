// lib/vercel-env-sync.ts
// Auto-sync environment variables to Vercel when Supabase is connected

interface VercelEnvVariable {
  key: string
  value: string
  target: ('production' | 'preview' | 'development')[]
  type: 'plain' | 'secret'
}

interface SyncEnvVarsParams {
  vercelProjectId: string
  vercelToken: string
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey?: string
}

/**
 * Sync Supabase credentials to Vercel project environment variables
 */
export async function syncSupabaseEnvVarsToVercel(
  params: SyncEnvVarsParams
): Promise<{ success: boolean; synced: string[]; errors: string[] }> {
  const { vercelProjectId, vercelToken, supabaseUrl, supabaseAnonKey, supabaseServiceKey } = params

  const synced: string[] = []
  const errors: string[] = []

  // Defensive validation of vercelProjectId to ensure only expected formats reach the Vercel API
  const vercelProjectIdPattern = /^[a-zA-Z0-9_-]+$/
  if (
    typeof vercelProjectId !== 'string' ||
    !vercelProjectIdPattern.test(vercelProjectId) ||
    vercelProjectId.length > 100
  ) {
    errors.push('Invalid Vercel project ID format')
    return {
      success: false,
      synced,
      errors
    }
  }

  const envVars: VercelEnvVariable[] = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: supabaseUrl,
      target: ['production', 'preview', 'development'],
      type: 'plain'
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: supabaseAnonKey,
      target: ['production', 'preview', 'development'],
      type: 'plain'
    }
  ]

  // Add service key if provided
  if (supabaseServiceKey) {
    envVars.push({
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      value: supabaseServiceKey,
      target: ['production', 'preview', 'development'],
      type: 'secret'
    })
  }

  // Sync each variable to Vercel
  for (const envVar of envVars) {
    try {
      // Check if variable already exists
      const existingVars = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/env`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!existingVars.ok) {
        errors.push(`Failed to check existing vars for ${envVar.key}`)
        continue
      }

      const existingData = await existingVars.json()
      const existing = existingData.envs?.find((v: any) => v.key === envVar.key)

      if (existing) {
        // Update existing variable
        const updateResponse = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${existing.id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              value: envVar.value,
              target: envVar.target,
              type: envVar.type
            })
          }
        )

        if (updateResponse.ok) {
          synced.push(`${envVar.key} (updated)`)
        } else {
          errors.push(`Failed to update ${envVar.key}`)
        }
      } else {
        // Create new variable
        const createResponse = await fetch(
          `https://api.vercel.com/v10/projects/${vercelProjectId}/env`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(envVar)
          }
        )

        if (createResponse.ok) {
          synced.push(`${envVar.key} (created)`)
        } else {
          const errorData = await createResponse.json()
          errors.push(`Failed to create ${envVar.key}: ${errorData.error?.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      errors.push(`Error syncing ${envVar.key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    synced,
    errors
  }
}

/**
 * Get Vercel project ID for a deployment
 */
export async function getVercelProjectId(
  vercelToken: string,
  projectName: string
): Promise<string | null> {
  try {
    const response = await fetch('https://api.vercel.com/v9/projects', {
      headers: {
        Authorization: `Bearer ${vercelToken}`
      }
    })

    if (!response.ok) return null

    const data = await response.json()
    const project = data.projects?.find((p: any) => p.name === projectName)
    
    return project?.id || null
  } catch (error) {
    console.error('Error getting Vercel project ID:', error)
    return null
  }
}

/**
 * Trigger redeployment after env vars update
 */
export async function triggerVercelRedeployment(
  vercelToken: string,
  deploymentUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: deploymentUrl,
          target: 'production'
        })
      }
    )

    return response.ok
  } catch (error) {
    console.error('Error triggering redeployment:', error)
    return false
  }
}
