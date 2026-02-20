// lib/vercel-env-sync.ts
// Auto-sync environment variables to Vercel when Supabase is connected

// Validate input
function isValidProjectId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0;
}
function isValidEnvKey(key: string) {
  return /^[A-Z0-9_]+$/.test(key) && key.length > 0;
}
function isValidToken(token: string) {
  return typeof token === 'string' && token.length > 20 && /^[a-zA-Z0-9\-_]+$/.test(token);
}
function isValidURL(url: string) {
  return /^https:\/\/[a-zA-Z0-9.\-\/]+$/.test(url);
}

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

// Enhanced error handler
function handleSyncError(error: unknown, context?: string) {
  let message = 'Unknown error';
  if (typeof error === 'object' && error !== null && 'message' in error) {
    message = (error as Error).message;
  } else if (typeof error === 'string') {
    message = error;
  }
  if (context) {
    console.error(`[Vercel Env Sync ERROR] ${context}:`, error);
  } else {
    console.error('[Vercel Env Sync ERROR]:', error);
  }
  return { error: 'Unexpected error while syncing environment variables. Please contact support.' };
}

/**
 * Sync Supabase credentials to Vercel project environment variables
 */
export async function syncSupabaseEnvVarsToVercel(
  params: SyncEnvVarsParams
): Promise<{ success: boolean; synced: string[]; errors: string[] }> {
  const { vercelProjectId, vercelToken, supabaseUrl, supabaseAnonKey, supabaseServiceKey } = params

  // Parameter validation
  if (!isValidProjectId(vercelProjectId)) {
    console.warn('Invalid Vercel project ID:', vercelProjectId);
    return { success: false, synced: [], errors: ['Invalid Vercel project ID.'] };
  }
  if (!isValidToken(vercelToken)) {
    console.warn('Invalid Vercel token provided');
    return { success: false, synced: [], errors: ['Invalid Vercel token.'] };
  }
  if (!isValidURL(supabaseUrl)) {
    console.warn('Invalid Supabase URL:', supabaseUrl);
    return { success: false, synced: [], errors: ['Invalid Supabase URL.'] };
  }

  const synced: string[] = []
  const errors: string[] = []
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

  // Validate envKeys
  for (const envVar of envVars) {
    if (!isValidEnvKey(envVar.key)) {
      console.warn(`Invalid env variable key: ${envVar.key}`);
      errors.push(`Invalid environment variable key: ${envVar.key}`);
      continue;
    }
  }

  // Sync each variable to Vercel
  for (const envVar of envVars) {
    // skip invalid keys
    if (!isValidEnvKey(envVar.key)) continue;

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
      handleSyncError(error, `Syncing env ${envVar.key}`)
    }
  }

  return {
    success: errors.length === 0,
    synced,
    errors
  }
}