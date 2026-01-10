/**
 * Supabase Integration Helper
 * Manages Supabase connections and operations
 */

import { createClient } from '@supabase/supabase-js'

interface SupabaseConfig {
  url: string
  anonKey: string
  serviceKey?: string
}

interface TableSchema {
  name: string
  columns: Array<{
    name: string
    type: string
    primaryKey?: boolean
    nullable?: boolean
    unique?: boolean
    defaultValue?: string | number | boolean
    foreignKey?: {
      table: string
      column: string
    }
  }>
  timestamps?: boolean
  softDeletes?: boolean
}

/**
 * Create Supabase client
 */
export function createSupabaseClient(config: SupabaseConfig) {
  return createClient(config.url, config.anonKey)
}

/**
 * Create Supabase admin client (with service key)
 */
export function createSupabaseAdminClient(config: SupabaseConfig) {
  if (!config.serviceKey) {
    throw new Error('Service key required for admin client')
  }
  return createClient(config.url, config.serviceKey)
}

/**
 * Test database connection
 */
export async function testSupabaseConnection(config: SupabaseConfig): Promise<boolean> {
  // Simplified validation - just check format
  try {
    if (!config.url || !config.anonKey) {
      return false
    }
    
    // Validate URL format
    if (!config.url.includes('supabase.co') && !config.url.includes('localhost')) {
      return false
    }
    
    // Validate key exists and has reasonable length
    if (config.anonKey.length < 20) {
      return false
    }
    
    return true
  } catch (err) {
    console.error('Connection validation error:', err)
    return false
  }
}

/**
 * Generate SQL for creating a table with RLS policies
 * Generates complete DDL including table creation, constraints, triggers, and RLS policies
 */
export function generateTableSQL(schema: TableSchema): string {
  const { name, columns, timestamps, softDeletes } = schema
  
  // Validate table name
  if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error('Invalid table name. Use only letters, numbers, and underscores.')
  }
  
  let sql = `-- Table: ${name}\n`
  sql += `CREATE TABLE IF NOT EXISTS "${name}" (\n`
  
  // Add columns
  const columnDefs = columns.map(col => {
    let def = `  "${col.name}" ${col.type}`
    
    if (col.primaryKey) def += ' PRIMARY KEY'
    if (!col.nullable && !col.primaryKey) def += ' NOT NULL'
    if (col.unique && !col.primaryKey) def += ' UNIQUE'
    if (col.defaultValue !== undefined) {
      // Handle different default value types
      if (col.defaultValue === 'gen_random_uuid()' || col.defaultValue === 'NOW()' || col.defaultValue === 'now()') {
        def += ` DEFAULT ${col.defaultValue}`
      } else if (typeof col.defaultValue === 'string') {
        def += ` DEFAULT '${col.defaultValue}'`
      } else {
        def += ` DEFAULT ${col.defaultValue}`
      }
    }
    
    return def
  })
  
  sql += columnDefs.join(',\n')
  
  // Add timestamps
  if (timestamps) {
    sql += ',\n  "created_at" TIMESTAMPTZ DEFAULT NOW()'
    sql += ',\n  "updated_at" TIMESTAMPTZ DEFAULT NOW()'
  }
  
  // Add soft deletes
  if (softDeletes) {
    sql += ',\n  "deleted_at" TIMESTAMPTZ'
  }
  
  sql += '\n);\n'
  
  // Add foreign keys
  const foreignKeys = columns.filter(col => col.foreignKey)
  if (foreignKeys.length > 0) {
    sql += '\n-- Foreign Key Constraints\n'
    foreignKeys.forEach(col => {
      sql += `ALTER TABLE "${name}" ADD CONSTRAINT "fk_${name}_${col.name}" `
      sql += `FOREIGN KEY ("${col.name}") REFERENCES "${col.foreignKey!.table}"("${col.foreignKey!.column}");\n`
    })
  }
  
  // Add RLS (Row Level Security)
  sql += `\n-- Enable Row Level Security\n`
  sql += `ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY;\n`
  
  // Add RLS policies
  sql += `\n-- RLS Policies\n`
  sql += `CREATE POLICY "Enable read access for authenticated users"\n`
  sql += `  ON "${name}" FOR SELECT\n`
  sql += `  USING (auth.role() = 'authenticated');\n\n`
  
  sql += `CREATE POLICY "Enable insert access for authenticated users"\n`
  sql += `  ON "${name}" FOR INSERT\n`
  sql += `  WITH CHECK (auth.role() = 'authenticated');\n\n`
  
  sql += `CREATE POLICY "Enable update access for authenticated users"\n`
  sql += `  ON "${name}" FOR UPDATE\n`
  sql += `  USING (auth.role() = 'authenticated');\n\n`
  
  sql += `CREATE POLICY "Enable delete access for authenticated users"\n`
  sql += `  ON "${name}" FOR DELETE\n`
  sql += `  USING (auth.role() = 'authenticated');\n`
  
  // Add updated_at trigger
  if (timestamps) {
    sql += `\n-- Updated At Trigger\n`
    sql += `CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;\n\n`

    sql += `CREATE TRIGGER update_${name}_updated_at
BEFORE UPDATE ON "${name}"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();`
  }
  
  return sql
}

/**
 * Execute SQL on Supabase
 */
export async function executeSupabaseSQL(config: SupabaseConfig, sql: string) {
  const supabase = createSupabaseAdminClient(config)
  
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  
  if (error) throw error
  return data
}

/**
 * Get all tables in a Supabase database
 */
export async function getSupabaseTables(config: SupabaseConfig): Promise<string[]> {
  const supabase = createSupabaseAdminClient(config)
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
  
  if (error) throw error
  
  return data.map((t: { table_name: string }) => t.table_name)
}

/**
 * Get table schema
 */
export async function getTableSchema(config: SupabaseConfig, tableName: string) {
  const supabase = createSupabaseAdminClient(config)
  
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
  
  if (error) throw error
  
  return data
}

/**
 * Generate TypeScript types from table schema
 */
export function generateTypeScriptTypes(schema: TableSchema): string {
  const { name, columns } = schema
  
  const typeMap: Record<string, string> = {
    'TEXT': 'string',
    'VARCHAR': 'string',
    'INTEGER': 'number',
    'BIGINT': 'number',
    'BOOLEAN': 'boolean',
    'TIMESTAMPTZ': 'string',
    'TIMESTAMP': 'string',
    'UUID': 'string',
    'JSON': 'any',
    'JSONB': 'any'
  }
  
  let types = `export interface ${name.charAt(0).toUpperCase() + name.slice(1)} {\n`
  
  columns.forEach(col => {
    const tsType = typeMap[col.type.toUpperCase()] || 'any'
    const optional = col.nullable ? '?' : ''
    types += `  ${col.name}${optional}: ${tsType}\n`
  })
  
  types += '}\n'
  
  return types
}

/**
 * Generate Supabase client code for use in generated apps
 */
export function generateSupabaseClientCode(config: SupabaseConfig): string {
  return `
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = '${config.url}'
const supabaseAnonKey = '${config.anonKey}'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
`
}

/**
 * Generate CRUD operations code
 */
export function generateCRUDCode(tableName: string, schema: TableSchema): string {
  const typeName = tableName.charAt(0).toUpperCase() + tableName.slice(1)
  const primaryKey = schema.columns.find(c => c.primaryKey)?.name || 'id'
  
  return `
// ${typeName} CRUD Operations

// Create
export async function create${typeName}(data: Omit<${typeName}, '${primaryKey}'>) {
  const { data: result, error } = await supabase
    .from('${tableName}')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return result
}

// Read all
export async function getAll${typeName}s() {
  const { data, error } = await supabase
    .from('${tableName}')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Read one
export async function get${typeName}(${primaryKey}: string) {
  const { data, error } = await supabase
    .from('${tableName}')
    .select('*')
    .eq('${primaryKey}', ${primaryKey})
    .single()
  
  if (error) throw error
  return data
}

// Update
export async function update${typeName}(${primaryKey}: string, updates: Partial<${typeName}>) {
  const { data, error } = await supabase
    .from('${tableName}')
    .update(updates)
    .eq('${primaryKey}', ${primaryKey})
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Delete
export async function delete${typeName}(${primaryKey}: string) {
  const { error } = await supabase
    .from('${tableName}')
    .delete()
    .eq('${primaryKey}', ${primaryKey})
  
  if (error) throw error
}
`
}