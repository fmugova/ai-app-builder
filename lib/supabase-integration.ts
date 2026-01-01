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
    defaultValue?: any
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
  try {
    const supabase = createSupabaseClient(config)
    const { error } = await supabase.from('_test').select('*').limit(1)
    
    // If table doesn't exist, that's fine - connection works
    if (error && !error.message.includes('does not exist')) {
      return false
    }
    
    return true
  } catch (err) {
    return false
  }
}

/**
 * Generate SQL for creating a table
 */
export function generateTableSQL(schema: TableSchema): string {
  const { name, columns, timestamps, softDeletes } = schema
  
  let sql = `CREATE TABLE IF NOT EXISTS "${name}" (\n`
  
  // Add columns
  const columnDefs = columns.map(col => {
    let def = `  "${col.name}" ${col.type}`
    
    if (col.primaryKey) def += ' PRIMARY KEY'
    if (!col.nullable && !col.primaryKey) def += ' NOT NULL'
    if (col.unique) def += ' UNIQUE'
    if (col.defaultValue !== undefined) {
      def += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`
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
  
  sql += '\n);'
  
  // Add foreign keys
  const foreignKeys = columns.filter(col => col.foreignKey)
  foreignKeys.forEach(col => {
    sql += `\n\nALTER TABLE "${name}" ADD CONSTRAINT "fk_${name}_${col.name}" `
    sql += `FOREIGN KEY ("${col.name}") REFERENCES "${col.foreignKey!.table}"("${col.foreignKey!.column}");`
  })
  
  // Add updated_at trigger
  if (timestamps) {
    sql += `\n\nCREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_${name}_updated_at
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
  
  return data.map((t: any) => t.table_name)
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