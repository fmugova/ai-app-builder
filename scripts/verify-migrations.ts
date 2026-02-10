/**
 * Database Migration Verification Script
 * 
 * Verifies that all required database migrations have been applied.
 * Checks table existence, column structure, and indexes.
 * 
 * Usage:
 * - npm run verify-db
 * - Called automatically in CI/CD pipeline
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TableCheck = {
  table: string;
  exists: boolean;
  columns?: string[];
  indexes?: string[];
  error?: string;
};

type VerificationResult = {
  success: boolean;
  tables: TableCheck[];
  errors: string[];
  warnings: string[];
};

/**
 * Required tables and their essential columns
 */
const REQUIRED_SCHEMA = {
  User: ['id', 'email', 'name', 'createdAt'],
  Account: ['id', 'userId', 'type', 'provider'],
  Project: ['id', 'userId', 'name', 'status', 'createdAt'],
  Deployment: ['id', 'projectId', 'deploymentUrl', 'status', 'createdAt'],
  SupabaseIntegration: ['id', 'userId', 'accessToken', 'connectedAt'],
  ApiEndpoint: ['id', 'projectId', 'name', 'method', 'path', 'createdAt'],
  DatabaseTable: ['id', 'databaseConnectionId', 'name', 'schema', 'createdAt'],
  Subscription: ['id', 'userId', 'stripeSubscriptionId', 'status', 'createdAt'],
  WebhookEvent: ['id', 'provider', 'eventType', 'payload', 'status', 'createdAt'],
} as const;

/**
 * Required indexes for performance
 */
const REQUIRED_INDEXES = {
  User: ['User_email_key'],
  Project: ['Project_userId_idx'],
  Deployment: ['Deployment_projectId_idx'],
  SupabaseIntegration: ['SupabaseIntegration_userId_idx'],
  ApiEndpoint: ['ApiEndpoint_projectId_idx'],
  DatabaseTable: ['DatabaseTable_databaseConnectionId_idx'],
  Subscription: ['Subscription_userId_idx', 'Subscription_stripeSubscriptionId_key'],
  WebhookEvent: ['WebhookEvent_status_retryAt_idx', 'WebhookEvent_provider_eventType_idx'],
};

/**
 * Main verification function
 */
export async function verifyDatabaseMigrations(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: true,
    tables: [],
    errors: [],
    warnings: [],
  };

  console.log('🔍 Verifying database schema...\n');

  try {
    // Check database connection
    await verifyConnection();
    console.log('✓ Database connection successful\n');

    // Check each required table
    for (const [tableName, columns] of Object.entries(REQUIRED_SCHEMA)) {
      const tableCheck = await verifyTable(tableName, columns);
      result.tables.push(tableCheck);

      if (!tableCheck.exists) {
        result.errors.push(`Table ${tableName} does not exist`);
        result.success = false;
      } else if (tableCheck.error) {
        result.errors.push(tableCheck.error);
        result.success = false;
      }
    }

    // Check indexes
    const indexWarnings = await verifyIndexes();
    result.warnings.push(...indexWarnings);

    // Check for common migration issues
    const migrationIssues = await checkMigrationStatus();
    if (migrationIssues.length > 0) {
      result.warnings.push(...migrationIssues);
    }

    // Verify data integrity
    const integrityIssues = await verifyDataIntegrity();
    if (integrityIssues.length > 0) {
      result.warnings.push(...integrityIssues);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Verification failed: ${errorMessage}`);
    result.success = false;
  }

  return result;
}

/**
 * Verifies database connection
 */
async function verifyConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot connect to database: ${errorMessage}`);
  }
}

/**
 * Verifies a single table exists with required columns
 */
async function verifyTable(
  tableName: string,
  requiredColumns: readonly string[]
): Promise<TableCheck> {
  try {
    // Check if table exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) as exists
    `;

    if (!tableExists[0]?.exists) {
      return {
        table: tableName,
        exists: false,
      };
    }

    // Get actual columns
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const actualColumns = columns.map((c) => c.column_name);

    // Check for missing columns
    const missingColumns = requiredColumns.filter(
      (col) => !actualColumns.includes(col)
    );

    if (missingColumns.length > 0) {
      return {
        table: tableName,
        exists: true,
        columns: actualColumns,
        error: `Missing columns: ${missingColumns.join(', ')}`,
      };
    }

    console.log(`✓ Table ${tableName} verified (${actualColumns.length} columns)`);

    return {
      table: tableName,
      exists: true,
      columns: actualColumns,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      table: tableName,
      exists: false,
      error: `Error checking table: ${errorMessage}`,
    };
  }
}

/**
 * Verifies required indexes exist
 */
async function verifyIndexes(): Promise<string[]> {
  const warnings: string[] = [];

  try {
    const indexes = await prisma.$queryRaw<Array<{ tablename: string; indexname: string }>>`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;

    const indexMap = new Map<string, Set<string>>();

    indexes.forEach((idx) => {
      if (!indexMap.has(idx.tablename)) {
        indexMap.set(idx.tablename, new Set());
      }
      indexMap.get(idx.tablename)!.add(idx.indexname);
    });

    for (const [table, requiredIndexes] of Object.entries(REQUIRED_INDEXES)) {
      const tableIndexes = indexMap.get(table) || new Set();

      for (const requiredIndex of requiredIndexes) {
        if (!tableIndexes.has(requiredIndex)) {
          warnings.push(
            `Missing recommended index: ${requiredIndex} on ${table}`
          );
        }
      }
    }

    if (warnings.length === 0) {
      console.log('✓ All recommended indexes present\n');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not verify indexes: ${errorMessage}`);
  }

  return warnings;
}

/**
 * Checks Prisma migration status
 */
async function checkMigrationStatus(): Promise<string[]> {
  const warnings: string[] = [];

  try {
    // Check if _prisma_migrations table exists
    const migrationsTable = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '_prisma_migrations'
      ) as exists
    `;

    if (!migrationsTable[0]?.exists) {
      warnings.push(
        'Prisma migrations table not found - run: npx prisma migrate deploy'
      );
      return warnings;
    }

    // Get migration status
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
      SELECT migration_name, finished_at, rolled_back_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC
    `;

    const failedMigrations = migrations.filter(
      (m) => !m.finished_at && !m.rolled_back_at
    );

    if (failedMigrations.length > 0) {
      warnings.push(
        `${failedMigrations.length} migration(s) did not complete successfully`
      );
    }

    const rolledBackMigrations = migrations.filter((m) => m.rolled_back_at);
    if (rolledBackMigrations.length > 0) {
      warnings.push(
        `${rolledBackMigrations.length} migration(s) were rolled back`
      );
    }

    console.log(`✓ Found ${migrations.length} applied migrations\n`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not check migration status: ${errorMessage}`);
  }

  return warnings;
}

/**
 * Verifies data integrity (foreign keys, constraints)
 */
async function verifyDataIntegrity(): Promise<string[]> {
  const warnings: string[] = [];

  try {
    // Check for orphaned records (records with invalid foreign keys)
    const orphanedProjects = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Project" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "User" u WHERE u.id = p."userId"
      )
    `;

    if (orphanedProjects[0]?.count > 0) {
      warnings.push(
        `Found ${orphanedProjects[0].count} orphaned projects (invalid userId)`
      );
    }

    const orphanedDeployments = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Deployment" d
      WHERE NOT EXISTS (
        SELECT 1 FROM "Project" p WHERE p.id = d."projectId"
      )
    `;

    if (orphanedDeployments[0]?.count > 0) {
      warnings.push(
        `Found ${orphanedDeployments[0].count} orphaned deployments (invalid projectId)`
      );
    }

    if (warnings.length === 0) {
      console.log('✓ Data integrity verified\n');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not verify data integrity: ${errorMessage}`);
  }

  return warnings;
}

/**
 * Prints verification results
 */
export function printVerificationResults(result: VerificationResult): void {
  console.log('\n━'.repeat(60));
  console.log('\n📊 Database Verification Results\n');
  console.log('━'.repeat(60));

  // Print tables
  console.log('\nTables:');
  result.tables.forEach((table) => {
    if (table.exists && !table.error) {
      console.log(`  ✓ ${table.table} (${table.columns?.length || 0} columns)`);
    } else if (table.exists && table.error) {
      console.log(`  ⚠️  ${table.table}: ${table.error}`);
    } else {
      console.log(`  ❌ ${table.table}: Does not exist`);
    }
  });

  // Print errors
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((error) => console.log(`  • ${error}`));
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((warning) => console.log(`  • ${warning}`));
  }

  console.log('\n━'.repeat(60));

  if (result.success) {
    if (result.warnings.length > 0) {
      console.log('\n✅ Database schema verified with warnings\n');
    } else {
      console.log('\n✅ Database schema fully verified!\n');
    }
  } else {
    console.log('\n❌ Database schema verification failed!\n');
    console.log('🔧 Fix instructions:\n');
    console.log('  1. Run pending migrations:');
    console.log('     npx prisma migrate deploy\n');
    console.log('  2. If that fails, reset and migrate:');
    console.log('     npx prisma migrate reset');
    console.log('     npx prisma migrate deploy\n');
    console.log('  3. Re-run verification:');
    console.log('     npm run verify-db\n');
  }
}

/**
 * Main function with exit on failure
 */
export async function verifyDatabaseOrExit(): Promise<void> {
  try {
    const result = await verifyDatabaseMigrations();
    printVerificationResults(result);

    if (!result.success) {
      process.exit(1);
    }

    // Exit with warning code if there are warnings
    if (result.warnings.length > 0) {
      process.exit(2);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('\n❌ Verification failed:', errorMessage);
    console.error('\nStack trace:', errorStack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
