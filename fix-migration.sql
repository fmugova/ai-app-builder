-- Fix ALL baseline migration records that have 0 applied steps
-- Run this in your Supabase SQL Editor for PRODUCTION database

-- Step 1: Check all migration records for this baseline
SELECT 
    id,
    migration_name,
    applied_steps_count,
    started_at,
    finished_at,
    logs
FROM "_prisma_migrations" 
WHERE migration_name = '20260110181255_baseline'
ORDER BY started_at DESC;

-- Step 2: Fix ALL records (not just one specific ID)
UPDATE "_prisma_migrations" 
SET applied_steps_count = 1,
    logs = 'Migration fixed: marked as successfully applied'
WHERE migration_name = '20260110181255_baseline' 
  AND applied_steps_count = 0;

-- Step 3: Verify all are fixed
SELECT 
    id,
    migration_name,
    applied_steps_count,
    started_at,
    finished_at,
    logs
FROM "_prisma_migrations" 
WHERE migration_name = '20260110181255_baseline'
ORDER BY started_at DESC;

-- Expected result: All records should have applied_steps_count = 1
