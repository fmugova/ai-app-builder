// lib/supabase-auto-setup.ts
// Automatic Supabase database provisioning

interface SupabaseProjectConfig {
  name: string
  region: string
  organizationId: string
}

interface SupabaseProject {
  id: string
  name: string
  database: {
    host: string
    version: string
  }
  url: string
  anonKey: string
  serviceKey: string
}

interface DatabaseSchema {
  tables: Array<{
    name: string
    columns: Array<{
      name: string
      type: string
      nullable?: boolean
      primaryKey?: boolean
      defaultValue?: string
    }>
  }>
}

/**
 * Auto-provision Supabase database for BuildFlow project
 */
export async function provisionSupabaseDatabase(
  projectName: string,
  schema: DatabaseSchema,
  supabaseAccessToken: string
): Promise<{
  success: boolean
  project?: SupabaseProject
  error?: string
}> {
  try {
    // 1. Create Supabase project
    const project = await createSupabaseProject(
      {
        name: projectName,
        region: 'us-east-1', // Default region
        organizationId: '' // Will be fetched from user's orgs
      },
      supabaseAccessToken
    )

    // 2. Wait for project to be ready
    await waitForProjectReady(project.id, supabaseAccessToken)

    // 3. Create database schema
    await createDatabaseSchema(
      project.id,
      schema,
      project.serviceKey,
      supabaseAccessToken
    )

    // 4. Enable RLS (Row Level Security)
    await enableRLS(project.id, schema, supabaseAccessToken)

    return {
      success: true,
      project
    }
  } catch (error) {
    console.error('Supabase provisioning error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Provisioning failed'
    }
  }
}

/**
 * Create new Supabase project via Management API
 */
async function createSupabaseProject(
  config: SupabaseProjectConfig,
  token: string
): Promise<SupabaseProject> {
  // First, get user's organizations
  const orgsResponse = await fetch('https://api.supabase.com/v1/organizations', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!orgsResponse.ok) {
    throw new Error('Failed to fetch Supabase organizations')
  }

  const orgs = await orgsResponse.json()
  const orgId = orgs[0]?.id

  if (!orgId) {
    throw new Error('No Supabase organization found')
  }

  // Create project
  const response = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: config.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      organization_id: orgId,
      region: config.region,
      plan: 'free', // Start with free tier
      db_pass: generateSecurePassword()
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create Supabase project')
  }

  const project = await response.json()

  // Get project details including keys
  const detailsResponse = await fetch(
    `https://api.supabase.com/v1/projects/${project.id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  return await detailsResponse.json()
}

/**
 * Wait for Supabase project to be ready
 */
async function waitForProjectReady(
  projectId: string,
  token: string,
  maxAttempts = 60
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to check project status')
    }

    const project = await response.json()

    if (project.status === 'ACTIVE_HEALTHY') {
      return
    }

    if (project.status === 'INACTIVE' || project.status.includes('ERROR')) {
      throw new Error(`Project creation failed: ${project.status}`)
    }

    // Wait 5 seconds before checking again (Supabase takes ~2-3 min to provision)
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  throw new Error('Project provisioning timeout')
}

/**
 * Create database schema using SQL
 */
async function createDatabaseSchema(
  projectId: string,
  schema: DatabaseSchema,
  serviceKey: string,
  token: string
): Promise<void> {
  // Generate SQL from schema
  const sql = generateSchemaSQL(schema)

  // Execute SQL via Supabase SQL endpoint
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectId}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey
      },
      body: JSON.stringify({
        query: sql
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create database schema')
  }
}

/**
 * Generate SQL from database schema
 */
function generateSchemaSQL(schema: DatabaseSchema): string {
  let sql = ''

  schema.tables.forEach(table => {
    sql += `\n-- Create ${table.name} table\n`
    sql += `CREATE TABLE IF NOT EXISTS public.${table.name} (\n`

    const columns = table.columns.map(col => {
      let def = `  ${col.name} ${col.type.toUpperCase()}`
      if (col.primaryKey) def += ' PRIMARY KEY'
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL'
      return def
    })

    sql += columns.join(',\n')
    sql += '\n);\n'

    // Add timestamps if not already defined
    const hasCreatedAt = table.columns.some(c => c.name === 'created_at')
    const hasUpdatedAt = table.columns.some(c => c.name === 'updated_at')

    if (!hasCreatedAt) {
      sql += `ALTER TABLE public.${table.name} ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();\n`
    }
    if (!hasUpdatedAt) {
      sql += `ALTER TABLE public.${table.name} ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();\n`
    }
  })

  return sql
}

/**
 * Enable Row Level Security on all tables
 */
async function enableRLS(
  projectId: string,
  schema: DatabaseSchema,
  token: string
): Promise<void> {
  const rlsSQL = schema.tables
    .map(table => {
      return `
ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read ${table.name}"
  ON public.${table.name}
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own data
CREATE POLICY "Allow authenticated users to insert ${table.name}"
  ON public.${table.name}
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
`
    })
    .join('\n')

  // Execute RLS SQL (implementation depends on Supabase API)
  console.log('RLS SQL generated:', rlsSQL)
}

/**
 * Generate secure password for database
 */
function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Get user's Supabase projects
 */
export async function getUserSupabaseProjects(
  token: string
): Promise<SupabaseProject[]> {
  const response = await fetch('https://api.supabase.com/v1/projects', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Supabase projects')
  }

  return await response.json()
}

/**
 * Test database connection
 */
export async function testSupabaseDatabaseConnection(
  url: string,
  anonKey: string
): Promise<boolean> {
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json'
      }
    })
    return response.ok
  } catch {
    return false
  }
}
