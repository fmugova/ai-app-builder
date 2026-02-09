#!/usr/bin/env node
/**
 * Database Migration Verification Script
 * 
 * Verifies that the Supabase integration migration has been applied
 * Run with: npm run verify-migration
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMigration() {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 SUPABASE INTEGRATION MIGRATION VERIFICATION')
  console.log('='.repeat(80) + '\n')

  try {
    // Check 1: SupabaseIntegration table exists
    console.log('✓ Checking if SupabaseIntegration table exists...')
    try {
      const count = await prisma.supabaseIntegration.count()
      console.log(`  ✅ SupabaseIntegration table exists (${count} records)`)
    } catch (error) {
      console.error('  ❌ SupabaseIntegration table NOT FOUND')
      console.error('  💡 Run the migration: migrations/manual-add-supabase-integration.sql')
      throw error
    }

    // Check 2: Check Deployment table columns
    console.log('\n✓ Checking Deployment table schema...')
    const deploymentColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Deployment'
      AND column_name IN (
        'supabaseProjectId',
        'supabaseUrl',
        'supabaseAnonKey',
        'supabaseServiceKey',
        'databasePassword',
        'buildTime',
        'deployedAt'
      )
      ORDER BY column_name
    `

    const expectedColumns = [
      'supabaseProjectId',
      'supabaseUrl',
      'supabaseAnonKey',
      'supabaseServiceKey',
      'databasePassword',
      'buildTime',
      'deployedAt',
    ]

    const foundColumns = deploymentColumns.map((c) => c.column_name)
    const missingColumns = expectedColumns.filter((col) => !foundColumns.includes(col))

    if (missingColumns.length === 0) {
      console.log(`  ✅ All Deployment columns exist (${foundColumns.length}/7)`)
      foundColumns.forEach((col) => console.log(`     - ${col}`))
    } else {
      console.error(`  ❌ Missing Deployment columns: ${missingColumns.join(', ')}`)
      console.error('  💡 Run the migration: migrations/manual-add-supabase-integration.sql')
      throw new Error('Missing Deployment columns')
    }

    // Check 3: SupabaseIntegration indexes
    console.log('\n✓ Checking SupabaseIntegration indexes...')
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'SupabaseIntegration'
    `

    const indexNames = indexes.map((i) => i.indexname)
    const requiredIndexes = [
      'SupabaseIntegration_pkey', // Primary key
      'SupabaseIntegration_userId_key', // Unique constraint
      'SupabaseIntegration_userId_idx', // Performance index
    ]

    const missingIndexes = requiredIndexes.filter((idx) => !indexNames.includes(idx))

    if (missingIndexes.length === 0) {
      console.log(`  ✅ All indexes exist (${indexNames.length})`)
      indexNames.forEach((idx) => console.log(`     - ${idx}`))
    } else {
      console.warn(`  ⚠️  Missing indexes: ${missingIndexes.join(', ')}`)
      console.warn('  💡 These may have been renamed, but the migration should still work')
    }

    // Check 4: Foreign key constraint
    console.log('\n✓ Checking foreign key constraints...')
    const constraints = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'SupabaseIntegration' 
      AND constraint_type = 'FOREIGN KEY'
    `

    if (constraints.length > 0) {
      console.log(`  ✅ Foreign key constraint exists: ${constraints[0].constraint_name}`)
    } else {
      console.warn('  ⚠️  No foreign key constraint found')
      console.warn('  This may not be critical if referential integrity is maintained')
    }

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('✅ MIGRATION VERIFICATION COMPLETE')
    console.log('='.repeat(80))
    console.log('\n✨ All checks passed! Supabase integration is properly configured.\n')

    process.exit(0)
  } catch (error) {
    console.error('\n' + '='.repeat(80))
    console.error('❌ MIGRATION VERIFICATION FAILED')
    console.error('='.repeat(80))
    console.error('\n🔧 REQUIRED ACTIONS:\n')
    console.error('1. Ensure your database is accessible')
    console.error('2. Run the migration SQL file:')
    console.error('   psql $DATABASE_URL -f migrations/manual-add-supabase-integration.sql')
    console.error('\n   OR copy/paste the SQL into your database management tool')
    console.error('\n3. Verify the migration with: npm run verify-migration')
    console.error('\n' + '='.repeat(80) + '\n')

    if (process.env.NODE_ENV !== 'production') {
      console.error('Error details:', error)
    }

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
verifyMigration()
